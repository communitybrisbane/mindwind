"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import FairCopy from "@/components/FairCopy";
import MicButton from "@/components/MicButton";
import SavedRecordChips from "@/components/SavedRecordChips";
import { requestToast } from "@/components/Toast";
import { authedFetch, authedJson, useUser } from "@/lib/db/useUser";
import type { ShapedRecord } from "@/lib/db/types";
import { resolveRecordDate } from "@/lib/logic/backdate";
import { tokyoDateKey, tokyoDayStart } from "@/lib/logic/date";
import { MAX_DIARY_LENGTH, MIN_DIARY_LENGTH, recordLimitFor } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";
import { parsePartialShaped } from "@/lib/logic/partialShaped";
import {
  fromStored,
  savedCards,
  type RecordMessage as Message,
} from "@/lib/logic/recordChatMessages";

// 記録フェーズ：1=日記 2=深掘り 3=清書（成形）
type Phase = 1 | 2 | 3;

const hints = ["何があった？", "どう考えた？", "なぜそうした？", "今の気持ちは？"];

/** 日付見出し（セリフ・大）。"7月18日" と曜日を分けて組む */
function splitHeading(date: Date): { day: string; weekday: string } {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: `${get("month")}月${get("day")}日`, weekday: get("weekday") };
}

/** メンターの書き込み（緑インクの余白メモ）。チャットバブルの代わり */
function MentorNote({
  text,
  sig,
  onSkip,
}: {
  text: string;
  sig?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="relative pl-[26px]">
      <span
        aria-hidden
        className="absolute left-0 top-[8px] h-[18px] w-[18px] rounded-[50%_50%_50%_4px] border-[1.6px] border-accent opacity-85"
      />
      <p className="font-serif text-[14.5px] leading-[34px] text-accent">
        <em className="not-italic border-b border-accent/45 pb-px">{text}</em>
      </p>
      {(sig || onSkip) && (
        <p className="text-[11px] leading-[34px] tracking-[0.12em] text-ink-tertiary">
          {sig}
          {onSkip && (
            <>
              {" ・ "}
              <button type="button" onClick={onSkip} className="underline">
                スキップできます
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** ?date= の読み取りに useSearchParams が必要なため Suspense で包み、
 * 日付切替（過去日 ⇄ 今日）で key を変えて書きかけの状態を確実にリセットする */
export default function RecordPage() {
  return (
    <Suspense>
      <RecordPageBody />
    </Suspense>
  );
}

function RecordPageBody() {
  const dateParam = useSearchParams().get("date");
  return <RecordSession key={dateParam ?? "today"} dateParam={dateParam} />;
}

function RecordSession({ dateParam }: { dateParam: string | null }) {
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
    ? splitHeading(targetDate ? tokyoDayStart(targetDate) : new Date())
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

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#f7f4ec]">
      {/* ページ見出し（ヘッダー。罫線の外） */}
      <div className="flex-none px-6 pb-2 pt-4">
        <div className="flex items-center justify-between text-[12px] tracking-[0.08em] text-ink-tertiary">
          <span>MindWind 日記</span>
          <span className="flex gap-1.5" aria-label={`ステップ${phase}／3`}>
            {([1, 2, 3] as const).map((step) => (
              <span
                key={step}
                className={`h-[3px] w-6 rounded-full ${step <= phase ? "bg-accent" : "bg-ceramic"}`}
              />
            ))}
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <h1 className="font-serif text-[30px] font-semibold leading-none text-primary">
            {heading?.day ?? " "}
            <span className="ml-2.5 text-[15px] font-normal tracking-[0.1em] text-ink-secondary">
              {heading?.weekday ?? ""}
            </span>
          </h1>
          {targetDate && (
            <Link href="/record" className="text-[13px] text-ink-secondary underline">
              今日に戻る
            </Link>
          )}
        </div>
        <p className="mt-1.5 text-[12px] tracking-[0.14em] text-ink-tertiary">
          — {pageWord}の{phase === 3 ? "清書" : "ページ"} —
        </p>
      </div>

      {/* ノートのページ（罫線はこのコンテナの背景。中の文字はすべて行送り34px） */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="notebook-paper min-h-full pl-[46px] pr-6">
          {/* 保存済み記録のしおり */}
          <SavedRecordChips records={cards} onDelete={(id) => void deleteRecord(id)} />

          {/* 送信済みの日記本文（深掘り以降はページに固定） */}
          {phase >= 2 && (
            <p className="whitespace-pre-wrap font-serif text-base leading-[34px] text-ink">
              {diaryText}
            </p>
          )}

          {/* 短文のうながし・言い換えのお願い */}
          {gentleNote && <MentorNote text={gentleNote} />}

          {/* 深掘り：メンターの書き込み＋続きの罫線に回答を書く */}
          {phase === 2 && deepDiveQuestion && (
            <MentorNote
              text={deepDiveQuestion}
              sig="メンターの書き込み"
              onSkip={sending ? undefined : skipDeepDive}
            />
          )}

          {(phase === 1 || phase === 2) && (
            <AutoGrowTextarea
              value={displayValue}
              onChange={(text) => {
                setActiveInput(text.slice(0, MAX_DIARY_LENGTH));
                if (gentleNote) setGentleNote("");
              }}
              readOnly={inputDisabled}
              placeholder={
                recording
                  ? "聞き取り中…話してみて"
                  : phase === 1
                    ? `${pageWord}は何があった？ 思いつくままに…`
                    : "ここに続きを書いてね…"
              }
              className="min-h-[170px] bg-transparent font-serif text-base leading-[34px] text-ink placeholder:text-ink-tertiary focus:outline-none"
            />
          )}

          {/* 成形を待つあいだの書き込み */}
          {sending && phase === 3 && !streamingShaped && (
            <p className="animate-pulse pl-[26px] font-serif text-[14.5px] leading-[34px] text-accent">
              清書しているよ…
            </p>
          )}

          {/* 清書（ストリーミング中→部分表示、完成後→編集可） */}
          {streamingShaped && !shaped && <FairCopy value={streamingShaped} />}
          {shaped && <FairCopy value={shaped} editable onChange={setShaped} />}

          {/* 赤インクの書き込み（エラー） */}
          {error && (
            <p className="font-serif text-[14px] leading-[34px] text-error">
              ※ {error}
              <button
                type="button"
                aria-label="エラーを閉じる"
                onClick={() => setError("")}
                className="ml-2 font-sans text-[12px] underline"
              >
                閉じる
              </button>
            </p>
          )}
          {saving && (
            <p className="font-serif text-[14px] leading-[34px] text-ink-secondary">保存中…</p>
          )}
        </div>
      </div>

      {/* 文具トレー（タブバーの直上・紙の上に置く） */}
      <div className="flex-none px-5 pb-4 pt-3">
        {limitReached &&
          (user?.isGuest ? (
            <p className="pb-2 text-[13px] text-ink-secondary">
              今日のゲストの上限に達しました。
              <Link href="/onboarding?edit=1" className="font-semibold text-accent underline">
                Google アカウントと連携
              </Link>
              するともっと記録できます
            </p>
          ) : (
            <p className="pb-2 text-[13px] text-ink-secondary">
              今日の記録は上限（{dailyLimit}件）に達しました
            </p>
          ))}
        {micError && (
          <p className="pb-2 font-serif text-[13px] text-error">
            ※ マイクを使えませんでした。ブラウザのマイク許可を確認してね
          </p>
        )}
        {phase === 1 && !limitReached && (
          <div className="mb-3 flex gap-4 overflow-x-auto px-1 font-serif text-[12px] text-ink-tertiary">
            {hints.map((hint) => (
              <span
                key={hint}
                className="whitespace-nowrap border-b border-dotted border-ink-tertiary pb-0.5"
              >
                {hint}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          {phase !== 3 && (
            <>
              <MicButton
                large
                disabled={inputDisabled}
                onFinal={(t) => setActiveInput((prev) => (prev + t).slice(0, MAX_DIARY_LENGTH))}
                onInterim={setInterim}
                onRecordingChange={(r) => {
                  setRecording(r);
                  if (r) setMicError(false);
                }}
                onError={() => setMicError(true)}
              />
              <span className="text-[12px] text-ink-tertiary">声でも書ける</span>
            </>
          )}
          <button
            type="button"
            onClick={done}
            disabled={doneDisabled}
            className={`ml-auto rounded-full border px-6 py-2.5 font-serif text-[15px] disabled:opacity-50 ${
              phase === 3
                ? "border-primary bg-primary text-white"
                : "border-primary/40 bg-white/60 text-primary"
            }`}
          >
            {phase === 3 ? "保存する ✦" : "書き終えた ✦"}
          </button>
        </div>
      </div>
    </main>
  );
}
