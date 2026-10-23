"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { requestToast } from "@/components/Toast";
import { authedFetch, authedJson, useUser } from "@/lib/db/useUser";
import type { ShapedRecord } from "@/lib/db/types";
import { resolveRecordDate } from "@/lib/logic/backdate";
import { splitDateHeading, tokyoDateKey, tokyoDayStart } from "@/lib/logic/date";
import { MIN_DIARY_LENGTH, recordLimitFor } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";
import { parsePartialShaped } from "@/lib/logic/partialShaped";
import {
  fromStored,
  savedCards,
  type RecordMessage as Message,
} from "@/lib/logic/recordChatMessages";

// 記録フェーズ：1=日記 2=深掘り 3=清書（成形）
export type Phase = 1 | 2 | 3;

/** 記録セッションの状態機械（日記 → 深掘り → 清書 → 保存）と、しおりの復元・編集・削除 */
export function useRecordSession(dateParam: string | null) {
  const router = useRouter();
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>(1);
  // 保存済みカード（しおり）。進行中セッションのテキストは recordChat に保存されない
  const [cards, setCards] = useState<Message[]>([]);
  const [diaryInput, setDiaryInput] = useState("");
  const [diaryText, setDiaryText] = useState(""); // 送信済みの日記本文（ページに固定表示）
  const [deepDiveQuestion, setDeepDiveQuestion] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [deepDiveAnswer, setDeepDiveAnswer] = useState("");
  // 深掘り以外の一言（短文のうながし・言い換えのお願い）もメンターの書き込みとして出す
  const [gentleNote, setGentleNote] = useState("");
  const [shaped, setShaped] = useState<ShapedRecord | null>(null);
  // 成形ストリーミング中のプレビュー（最終値はサーバーがパースした shaped で置き換える）
  const [streamingShaped, setStreamingShaped] = useState<Partial<ShapedRecord> | null>(null);
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // しおり（保存済み記録）の編集
  const [editing, setEditing] = useState<{ thoughtId: string; shaped: ShapedRecord } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 日付はクライアントで確定（サーバーとのハイドレーション差異を避ける）
  const todayKey = useSyncExternalStore(
    () => () => {},
    () => tokyoDateKey(new Date()),
    () => "",
  );

  // 過去日付モード：?date= が有効な過去日のときだけ。今日・不正・未来は通常モード（サーバー側でも検証）
  const resolved = todayKey ? resolveRecordDate(dateParam, todayKey) : null;
  const targetDate = resolved?.ok && resolved.isPast ? resolved.date : null;
  const heading = todayKey
    ? splitDateHeading(targetDate ? tokyoDayStart(targetDate) : new Date())
    : null;
  const pageWord = targetDate ? "この日" : "今日";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [phase, shaped, sending, streamingShaped, gentleNote]);

  // 当日の保存済みカード（しおり）を復元。過去日付モードは復元対象外
  useEffect(() => {
    if (!user || dateParam) return;
    authedFetch(user, "/api/record-chat")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.recordChat?.messages)
          setCards(savedCards(fromStored(data.recordChat.messages)));
      })
      .catch(() => {});
  }, [user, dateParam]);

  const dailyLimit = recordLimitFor(user?.isGuest ?? false);
  const limitReached = cards.length >= dailyLimit;

  async function sendDiary() {
    if (!user || sending) return;
    const text = (diaryInput + interim).trim();
    if (!text) return;
    // 超短文は AI を呼ばずにやさしく促す（「疲れた。しんどい。」程度の短い日記は通す）
    if (text.length < MIN_DIARY_LENGTH) {
      setGentleNote("もう少しだけ聞かせて。一言でも、何があったかだけでも大丈夫だよ。");
      return;
    }
    setGentleNote("");
    setError("");
    setSending(true);
    try {
      const res = await authedJson(user, "POST", "/api/deepdive", { diary: text });
      if (res.status === 422) {
        // refusal 等の異常応答：書き込みで言い換えをお願いする
        setGentleNote("申し訳ない、もう一度詳しく説明してもらえますか？");
        return;
      }
      if (res.status === 429) {
        setError("今日の AI の利用上限に達しました。また明日書こう");
        return;
      }
      if (!res.ok) throw new Error(`deepdive ${res.status}`);
      const { question } = await res.json();
      setDiaryText(text);
      setDiaryInput("");
      setDeepDiveQuestion(question);
      setPhase(2);
    } catch {
      setError("質問を用意できませんでした。少し待ってからもう一度送ってみてください。");
    } finally {
      setSending(false);
    }
  }

  function sendAnswer() {
    const text = (answerInput + interim).trim();
    // 何も書かずに「書き終えた」＝スキップと同じ扱い
    void startShaping(text);
  }

  function skipDeepDive() {
    setAnswerInput("");
    void startShaping("");
  }

  async function startShaping(answer: string) {
    if (!user || sending) return;
    setDeepDiveAnswer(answer);
    setPhase(3);
    setError("");
    setSending(true);
    setStreamingShaped(null);
    try {
      const res = await authedJson(user, "POST", "/api/shape", {
        diary: diaryText,
        deepDiveQuestion: answer ? deepDiveQuestion : "",
        deepDiveAnswer: answer,
      });
      if (res.status === 429) {
        setStreamingShaped(null);
        setError("今日の AI の利用上限に達しました。また明日書こう");
        setPhase(2);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`shape ${res.status}`);

      // JSON の生成をストリームで受け、項目ができたそばから清書に埋めていく
      let jsonText = "";
      let finalShaped: ShapedRecord | null = null;
      let incomplete = false;
      let failed = false;
      await readNdjson(res.body, (event) => {
        const data = event as
          | { type: "delta"; text: string }
          | { type: "shaped"; shaped: ShapedRecord }
          | { type: "incomplete" }
          | { type: "done" }
          | { type: "error" };
        if (data.type === "delta") {
          jsonText += data.text;
          setStreamingShaped(parsePartialShaped(jsonText));
        } else if (data.type === "shaped") {
          finalShaped = data.shaped;
        } else if (data.type === "incomplete") {
          incomplete = true;
        } else if (data.type === "error") {
          failed = true;
        }
      });

      if (incomplete) {
        // refusal 等の異常応答：言い換えをお願いして深掘りに戻す
        setStreamingShaped(null);
        setGentleNote("申し訳ない、もう一度詳しく説明してもらえますか？");
        setPhase(2);
        return;
      }
      if (failed || !finalShaped) throw new Error("shape stream error");
      setShaped(finalShaped);
      setStreamingShaped(null);
    } catch {
      setStreamingShaped(null);
      setError("記録を整理できませんでした。少し待ってからもう一度試してください。");
      setPhase(2);
    } finally {
      setSending(false);
    }
  }

  async function saveRecord() {
    if (!user || !shaped || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await authedJson(user, "POST", "/api/thoughts", {
        shaped,
        rawText: diaryText,
        deepDiveQuestion: deepDiveAnswer ? deepDiveQuestion : "",
        deepDiveAnswer,
        ...(targetDate ? { date: targetDate } : {}),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        // 過去日は1日1件まで（別端末等で先に保存されていた場合）
        if (data?.error === "date_taken") {
          setError("この日はすでに記録があります。書き直すには、カレンダーからこの日の記録を削除してね");
        } else {
          setError(`今日の記録は上限（${dailyLimit}件）に達しました`);
        }
        return;
      }
      if (!res.ok) throw new Error(`thoughts ${res.status}`);
      requestToast("記録しました");
      router.push("/home");
    } catch {
      setError("保存できませんでした。少し待ってからもう一度試してください。");
    } finally {
      setSaving(false);
    }
  }

  // しおりの編集を保存：サーバーが embedding と recordChat のカードを更新する
  async function saveEdit(shaped: ShapedRecord) {
    if (!user || !editing || editSaving) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await authedJson(user, "PUT", `/api/thoughts/${editing.thoughtId}`, { shaped });
      if (!res.ok) throw new Error(`update ${res.status}`);
      setCards((c) =>
        c.map((m) =>
          m.kind === "card" && m.thoughtId === editing.thoughtId ? { ...m, shaped } : m
        )
      );
      setEditing(null);
      requestToast("記録を更新しました");
    } catch {
      setEditError("保存できませんでした。少し待ってからもう一度試してください。");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteRecord(thoughtId: string) {
    if (!user || !thoughtId) return;
    if (!window.confirm("この記録を削除しますか？ 削除すると元に戻せません。")) return;
    setError("");
    try {
      const res = await authedFetch(user, `/api/thoughts/${thoughtId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      setCards((c) => c.filter((m) => m.kind !== "card" || m.thoughtId !== thoughtId));
    } catch {
      setError("削除できませんでした。少し待ってからもう一度試してください。");
    }
  }
  // 「書き終えた ✦」（phase 3 では「保存する ✦」）
  function done() {
    if (phase === 1) void sendDiary();
    else if (phase === 2) sendAnswer();
    else void saveRecord();
  }

  const inputDisabled = sending || limitReached;
  const activeInput = phase === 1 ? diaryInput : answerInput;
  const setActiveInput = phase === 1 ? setDiaryInput : setAnswerInput;
  const displayValue = interim ? activeInput + interim : activeInput;
  const doneDisabled =
    sending || saving || limitReached || (phase === 3 && !shaped) || (phase === 1 && !displayValue.trim());

  return {
    user, phase, cards, diaryText, deepDiveQuestion, deepDiveAnswer, gentleNote, setGentleNote,
    shaped, setShaped, streamingShaped, setInterim, recording, setRecording, micError, setMicError,
    sending, saving, error, setError, editing, setEditing, editSaving, editError, setEditError,
    scrollRef, targetDate, heading, pageWord, dailyLimit, limitReached,
    skipDeepDive, saveEdit, deleteRecord, done,
    inputDisabled, setActiveInput, displayValue, doneDisabled,
  };
}
