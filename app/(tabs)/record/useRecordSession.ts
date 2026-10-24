"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { requestToast, showToast } from "@/components/ui/Toast";
import type { ApiError, CreateThoughtRequest, CreateThoughtResponse, ThoughtsListResponse } from "@/lib/api/contracts";
import type { ThoughtSummary } from "@/lib/db/types";
import { authedFetch, authedJson, useUser } from "@/lib/db/useUser";
import { resolveRecordDate } from "@/lib/logic/backdate";
import { splitDateHeading, tokyoDateKey, tokyoDayStart } from "@/lib/logic/date";
import { draftKey, type DraftData } from "@/lib/logic/draft";
import {
  DIARY_TOO_SHORT_MESSAGE,
  MAX_DIARY_LENGTH,
  MIN_DIARY_LENGTH,
  recordLimitFor,
} from "@/lib/logic/limits";
import { loadDraft, saveDraft } from "@/lib/ui/draftStore";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useDraft } from "@/lib/ui/useDraft";
import { useLimitedInput } from "@/lib/ui/useLimitedInput";
import { useTodayMood } from "@/lib/ui/useTodayMood";
import { useSpeech } from "./useSpeech";

/** 記録の段階：1=日記 2=深掘り 3=封をしている（保存中） */
export type RecordStep = 1 | 2 | 3;

/** 封蝋の演出の長さ（プロトタイプ recSave の 1100ms） */
const SEAL_MS = 1100;

const AI_LIMIT_MESSAGE = "今日の AI の利用上限に達しました。また明日書こう";
const RETRY_NOTE = "申し訳ない、もう一度詳しく説明してもらえますか？";

/* ---------- 記録セッション ---------- */

/** 記録タブの状態機械（日記 → 深掘りの1問 → 長押しで封をして保存）と、しおり・下書き */
export function useRecordSession(dateParam: string | null) {
  const router = useRouter();
  const { user } = useUser();
  const { mood: todayMood } = useTodayMood();

  // 日付はクライアントで確定（サーバーとのハイドレーション差異を避ける）
  const todayKey = useSyncExternalStore(
    () => () => {},
    () => tokyoDateKey(new Date()),
    () => "",
  );
  // 過去日モード：?date= が有効な過去日のときだけ。今日・不正・未来は通常モード（サーバー側でも検証）
  const resolved = todayKey ? resolveRecordDate(dateParam, todayKey) : null;
  const targetDate = resolved?.ok && resolved.isPast ? resolved.date : null;
  const dateKey = targetDate ?? todayKey;
  const heading = todayKey ? splitDateHeading(tokyoDayStart(dateKey)) : null;
  const pageWord = targetDate ? "この日" : "今日";
  const key = todayKey ? draftKey(targetDate ? "past" : "today", dateKey) : "";

  const [step, setStep] = useState<RecordStep>(1);
  const diary = useLimitedInput({ max: MAX_DIARY_LENGTH, label: "日記は" });
  const answer = useLimitedInput({ max: MAX_DIARY_LENGTH, label: "答えは" });
  const [question, setQuestion] = useState("");
  // 深掘り以外のメンターの一言（言い換えのお願い）
  const [note, setNote] = useState("");
  const [interim, setInterim] = useState("");
  const [asking, setAsking] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<ThoughtSummary[]>([]);
  // 保存した本文か答えに危機の言葉があった（PLAN 85）：窓口を案内してからホームへ
  const [crisis, setCrisis] = useState(false);

  /* ---- 下書き（端末内だけ） ---- */
  const draft = useDraft(key);
  const restoredRef = useRef("");
  const setDiaryValue = diary.setValue;
  const setAnswerValue = answer.setValue;
  useEffect(() => {
    if (!key) return;
    // localStorage は SSR に無いので、マウント後に読む
    const t = setTimeout(() => {
      const d = loadDraft(key);
      restoredRef.current = key;
      if (!d) return;
      setDiaryValue(d.rawText);
      if (d.step === 2 && d.deepDiveQuestion) {
        setQuestion(d.deepDiveQuestion);
        setAnswerValue(d.deepDiveAnswer);
        setStep(2);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [key, setDiaryValue, setAnswerValue]);

  const currentDraft = useCallback(
    (over?: Partial<DraftData>): DraftData => ({
      rawText: diary.value,
      deepDiveQuestion: step === 2 ? question : "",
      deepDiveAnswer: step === 2 ? answer.value : "",
      step: step === 2 ? 2 : 1,
      savedAt: Date.now(),
      ...over,
    }),
    [diary.value, answer.value, question, step],
  );

  const saveDraftDebounced = draft.save;
  useEffect(() => {
    // 復元が済むまで・封をしている間は書かない（空で上書きしない）
    if (!key || restoredRef.current !== key || step === 3) return;
    saveDraftDebounced(currentDraft());
  }, [key, step, currentDraft, saveDraftDebounced]);

  /* ---- しおり（その日にすでに保存した記録） ---- */
  useEffect(() => {
    if (!user || !dateKey) return;
    let alive = true;
    authedFetch(user, `/api/thoughts?date=${dateKey}`)
      .then((res) => (res.ok ? (res.json() as Promise<ThoughtsListResponse>) : null))
      .then((data) => {
        if (alive && data?.thoughts) setCards([...data.thoughts].reverse());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, dateKey]);

  const isGuest = user?.isGuest ?? false;
  const dailyLimit = recordLimitFor(isGuest);
  const limitReached = !targetDate && cards.length >= dailyLimit;
  // 過去日は1日1件まで
  const dateTaken = !!targetDate && cards.length > 0;
  const blocked = limitReached || dateTaken;

  /* ---- 音声 ---- */
  const valuesRef = useRef({ diary: diary.value, answer: answer.value, step, key, currentDraft });
  useEffect(() => {
    valuesRef.current = { diary: diary.value, answer: answer.value, step, key, currentDraft };
  });
  const speech = useSpeech({
    onInterim: setInterim,
    onFinal: (t) => {
      const v = valuesRef.current;
      if (v.step === 3) return;
      if (v.step === 1) {
        const next = (v.diary + t).slice(0, MAX_DIARY_LENGTH);
        setDiaryValue(next);
        if (v.key) saveDraft(v.key, v.currentDraft({ rawText: next }));
      } else {
        const next = (v.answer + t).slice(0, MAX_DIARY_LENGTH);
        setAnswerValue(next);
        if (v.key) saveDraft(v.key, v.currentDraft({ deepDiveAnswer: next }));
      }
    },
    onError: () => showToast("マイクを使えませんでした。ブラウザのマイク許可を確認してね"),
  });

  function toggleMic() {
    if (speech.recording) {
      speech.stop();
    } else {
      sound("pop");
      speech.start();
    }
  }

  /* ---- 1 → 2：深掘りの1問 ---- */
  async function finishDiary() {
    if (!user || asking || step !== 1 || blocked) return;
    if (speech.recording) speech.stop();
    const text = (diary.value + interim).trim();
    if (text.length < MIN_DIARY_LENGTH) {
      showToast(DIARY_TOO_SHORT_MESSAGE);
      vibrate(30);
      return;
    }
    if (interim) setDiaryValue((diary.value + interim).slice(0, MAX_DIARY_LENGTH));
    setNote("");
    setError("");
    setAsking(true);
    try {
      const res = await authedJson(user, "POST", "/api/deepdive", { diary: text });
      if (res.status === 422) {
        setNote(RETRY_NOTE);
        return;
      }
      if (res.status === 429) {
        // 質問は出せないが、日記はそのまま封をして残せるようにする
        setError(AI_LIMIT_MESSAGE);
        setQuestion("");
        setStep(2);
        return;
      }
      if (!res.ok) throw new Error(`deepdive ${res.status}`);
      const { question: q } = (await res.json()) as { question: string };
      vibrate([10, 20, 14]);
      sound("rub");
      setQuestion(q);
      setStep(2);
    } catch {
      setError("質問を用意できませんでした。少し待ってからもう一度送ってみてください。");
    } finally {
      setAsking(false);
    }
  }

  /* ---- 2 → 3：封をして保存 ---- */
  async function seal(skipped: boolean) {
    if (!user || step !== 2 || sealing) return;
    if (speech.recording) speech.stop();
    const rawText = diary.value.trim();
    const ans = skipped ? "" : (answer.value + interim).trim();
    const body: CreateThoughtRequest = {
      rawText,
      deepDiveQuestion: ans ? question : "",
      deepDiveAnswer: ans,
      kind: "full",
      ...(targetDate ? { date: targetDate } : {}),
    };
    if (skipped) answer.setValue("");
    setError("");
    setSealing(true);
    setStep(3);
    sound("seal");
    vibrate([20, 40, 36]);

    const wait = new Promise((r) => setTimeout(r, SEAL_MS));
    try {
      const res = await authedJson(user, "POST", "/api/thoughts", body);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        if (res.status === 409 && data?.error === "date_taken") {
          throw new Error("この日はすでに記録があります。書き直すには、風の記録からこの日の記録を消してね");
        }
        if (res.status === 409) throw new Error(`今日の記録は上限（${dailyLimit}件）に達しました`);
        if (data?.error === "too_short") throw new Error(DIARY_TOO_SHORT_MESSAGE);
        throw new Error("保存できませんでした。少し待ってからもう一度試してください。");
      }
      const saved = (await res.json().catch(() => null)) as CreateThoughtResponse | null;
      draft.clear();
      await wait;
      requestToast("記録したよ。");
      // 保存はできている。危機の言葉があったら、窓口を案内してからホームへ（CrisisNote のボタンで進む）
      if (saved?.crisis === true) {
        setCrisis(true);
        return;
      }
      router.push("/home");
    } catch (e) {
      await wait;
      setSealing(false);
      setStep(2);
      setError(e instanceof Error && e.message ? e.message : "保存できませんでした。");
    }
  }

  /* ---- しおりの更新（ThoughtModal から） ---- */
  function onCardUpdated(t: ThoughtSummary) {
    setCards((c) => c.map((x) => (x.id === t.id ? t : x)));
  }
  function onCardDeleted(id: string) {
    setCards((c) => c.filter((x) => x.id !== id));
  }

  const activeValue = step === 1 ? diary.value : answer.value;
  const displayDiary = step === 1 && interim ? diary.value + interim : diary.value;
  const displayAnswer = step === 2 && interim ? answer.value + interim : answer.value;

  return {
    user,
    isGuest,
    step,
    diary,
    answer,
    displayDiary,
    displayAnswer,
    activeValue,
    question,
    note,
    setNote,
    error,
    setError,
    asking,
    sealing,
    crisis,
    finishCrisis: () => router.push("/home"),
    cards,
    onCardUpdated,
    onCardDeleted,
    todayKey,
    targetDate,
    heading,
    pageWord,
    dailyLimit,
    limitReached,
    dateTaken,
    blocked,
    sealMood: targetDate ? null : todayMood,
    mic: { supported: speech.supported, recording: speech.recording, toggle: toggleMic },
    finishDiary,
    seal,
  };
}
