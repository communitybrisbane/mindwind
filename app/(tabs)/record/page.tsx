"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatInputBar from "@/components/ChatInputBar";
import SavedRecordChips from "@/components/SavedRecordChips";
import ThinkingBubble from "@/components/ThinkingBubble";
import { requestToast } from "@/components/Toast";
import ShapedCard from "@/components/ShapedCard";
import { BlocksIcon, SparklesIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, authedJson, useUser } from "@/lib/db/useUser";
import type { ShapedRecord } from "@/lib/db/types";
import { formatDateHeading } from "@/lib/logic/date";
import { MAX_DIARY_LENGTH, MIN_DIARY_LENGTH, recordLimitFor } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";
import { parsePartialShaped } from "@/lib/logic/partialShaped";
import {
  currentSession,
  fromStored,
  savedCards,
  type RecordMessage as Message,
} from "@/lib/logic/recordChatMessages";
import { SHAPED_FIELDS } from "@/lib/db/types";

/** 成形ストリーミング中のプレビューカード（できた項目から順に表示・編集は完成後） */
function StreamingShapedCard({ partial }: { partial: Partial<ShapedRecord> }) {
  const fields = SHAPED_FIELDS.filter(({ key }) => partial[key] !== undefined);
  if (fields.length === 0) return null;
  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <div className="flex flex-col gap-4">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <p className="text-[13px] font-semibold text-accent">{label}</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {partial[key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 記録フェーズ：1=日記 2=深掘り 3=成形
type Phase = 1 | 2 | 3;

const phaseSubtitles: Record<Phase, string> = {
  1: "今日のこと",
  2: "もう少しだけ",
  3: "今日の記録",
};

const hints = [
  "何があった？",
  "どう考えた？",
  "どう動いた？",
  "なぜそうした？",
  "今どんな気持ち？",
];

export default function RecordPage() {
  const router = useRouter();
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [diaryText, setDiaryText] = useState("");
  const [deepDiveQuestion, setDeepDiveQuestion] = useState("");
  const [deepDiveAnswer, setDeepDiveAnswer] = useState("");
  const [shaped, setShaped] = useState<ShapedRecord | null>(null);
  // 成形ストリーミング中のプレビュー（最終値はサーバーがパースした shaped で置き換える）
  const [streamingShaped, setStreamingShaped] = useState<Partial<ShapedRecord> | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 日付はクライアントで確定（サーバーとのハイドレーション差異を避ける）
  const dateHeading = useSyncExternalStore(
    () => () => {},
    () => formatDateHeading(new Date()),
    () => "",
  );

  useEffect(() => {
    // sending も依存に入れて「考え中バブル」が出た瞬間に最下部へスクロール
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, shaped, sending, streamingShaped]);

  // 当日の記録チャットを復元（日付が変わっていればサーバーが null を返し空状態から始まる）
  useEffect(() => {
    if (!user) return;
    authedFetch(user, "/api/record-chat")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.recordChat?.messages)
          setMessages(fromStored(data.recordChat.messages));
      })
      .catch(() => {});
  }, [user]);

  // 保存済みのやり取りはタイトルだけのチップに畳み、進行中のメッセージだけをチャットに出す
  const savedRecords = savedCards(messages);
  const currentMessages = currentSession(messages);
  const [hasDraft, setHasDraft] = useState(false);
  // 空状態の案内は「まだ何もない」ときだけ（入力を始めたら・今日すでに記録があるときは出さない）
  const showEmptyState =
    currentMessages.length === 0 && savedRecords.length === 0 && !hasDraft;

  const dailyLimit = recordLimitFor(user?.isGuest ?? false);
  const limitReached = savedRecords.length >= dailyLimit;

  async function sendDiary(text: string) {
    if (!user) return;
    // 超短文は AI を呼ばずにやさしく促す（「疲れた。しんどい。」程度の短い日記は通す）
    if (text.trim().length < MIN_DIARY_LENGTH) {
      setMessages((m) => [
        ...m,
        { role: "user", kind: "text", text },
        {
          role: "ai",
          kind: "text",
          text: "もう少しだけ聞かせて。一言でも、何があったかだけでも大丈夫だよ。",
        },
      ]);
      return;
    }
    setMessages((m) => [...m, { role: "user", kind: "text", text }]);
    setDiaryText(text);
    setError("");
    setSending(true);
    try {
      const res = await authedJson(user, "POST", "/api/deepdive", {
        diary: text,
      });
      if (res.status === 422) {
        // refusal 等の異常応答：AI バブルで言い換えをお願いする
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            kind: "text",
            text: "申し訳ない、もう一度詳しく説明してもらえますか？",
          },
        ]);
        return;
      }
      if (!res.ok) throw new Error(`deepdive ${res.status}`);
      const { question } = await res.json();
      setDeepDiveQuestion(question);
      setMessages((m) => [...m, { role: "ai", kind: "text", text: question }]);
      setPhase(2);
    } catch {
      setError(
        "質問を用意できませんでした。少し待ってからもう一度送ってみてください。",
      );
      setMessages((m) => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function sendAnswer(text: string) {
    setMessages((m) => [...m, { role: "user", kind: "text", text }]);
    void startShaping(text);
  }

  function skipDeepDive() {
    void startShaping("");
  }

  async function startShaping(answer: string) {
    if (!user) return;
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

      // JSON の生成をストリームで受け、項目ができたそばからカードに埋めていく
      let jsonText = "";
      let introAdded = false;
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
          const partial = parsePartialShaped(jsonText);
          if (!introAdded && Object.keys(partial).length > 0) {
            introAdded = true;
            setMessages((m) => [
              ...m,
              { role: "ai", kind: "text", text: "今日の記録を整理したよ。違うところは直してね。" },
            ]);
          }
          setStreamingShaped(partial);
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
        setMessages((m) => [
          ...m,
          { role: "ai", kind: "text", text: "申し訳ない、もう一度詳しく説明してもらえますか？" },
        ]);
        setPhase(2);
        return;
      }
      if (failed || !finalShaped) throw new Error("shape stream error");
      setShaped(finalShaped);
      setStreamingShaped(null);
    } catch {
      setStreamingShaped(null);
      setError(
        "記録を整理できませんでした。少し待ってからもう一度試してください。",
      );
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
      });
      if (res.status === 409) {
        setError(`今日の記録は上限（${dailyLimit}件）に達しました`);
        return;
      }
      if (!res.ok) throw new Error(`thoughts ${res.status}`);
      // recordChat（保存済みカードの追記）はサーバー側が同じリクエスト内で処理する
      requestToast("記録しました");
      router.push("/home");
    } catch {
      setError("保存できませんでした。少し待ってからもう一度試してください。");
    } finally {
      setSaving(false);
    }
  }

  function handleSend(text: string) {
    if (phase === 1) void sendDiary(text);
    else if (phase === 2) sendAnswer(text);
  }

  async function deleteRecord(thoughtId: string) {
    if (!user || !thoughtId) return;
    if (!window.confirm("この記録を削除しますか？ 削除すると元に戻せません。"))
      return;
    setError("");
    try {
      const res = await authedFetch(user, `/api/thoughts/${thoughtId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      // 該当セッション（前カードの直後〜このカード）をローカルからも取り除く
      setMessages((m) => {
        const kept: Message[] = [];
        let buffer: Message[] = [];
        for (const message of m) {
          buffer.push(message);
          if (message.kind === "card") {
            if (message.thoughtId !== thoughtId) kept.push(...buffer);
            buffer = [];
          }
        }
        kept.push(...buffer);
        return kept;
      });
    } catch {
      setError("削除できませんでした。少し待ってからもう一度試してください。");
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* ステップバー（ラベルなし・3本） */}
      <div
        className="flex flex-none gap-1.5 px-4 pt-3"
        aria-label={`ステップ${phase}／3`}
      >
        {([1, 2, 3] as const).map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${step <= phase ? "bg-accent" : "bg-ceramic"}`}
          />
        ))}
      </div>

      {/* 日付見出し（日記帳の質感） */}
      <div className="flex-none px-4 pb-2 pt-4">
        <h1 className="text-[22px] font-semibold text-primary">
          {dateHeading || " "}
        </h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          {phaseSubtitles[phase]}
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mx-4 mb-1 flex flex-none items-start justify-between gap-2 rounded-lg border border-error bg-error/5 px-3 py-2.5">
          <p className="text-sm text-error">{error}</p>
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setError("")}
            className="text-sm font-semibold text-error"
          >
            ×
          </button>
        </div>
      )}

      {/* チャットエリア */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4"
      >
        {/* 保存済み記録（畳んだチップ。タップで展開） */}
        <SavedRecordChips
          records={savedRecords}
          onDelete={(id) => void deleteRecord(id)}
        />

        {currentMessages.length === 0 ? (
          showEmptyState && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <BlocksIcon className="h-16 w-16 text-accent" strokeWidth={1.2} />
              <p className="mt-5 text-lg font-semibold text-ink">
                今日のことを話してみよう
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                うまくいった日も、そうでない日も。
                <br />
                記録が積み重なるほどパターンが見えてきます
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4 py-3">
            {currentMessages.map((msg, i) =>
              msg.kind === "card" ? null : msg.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-xl rounded-br-[4px] bg-accent px-4 py-3 font-serif text-[15px] leading-relaxed text-white"
                >
                  {msg.text}
                </div>
              ) : (
                <div key={i} className="flex max-w-[92%] items-start gap-2">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary">
                    <SpiralIcon className="h-3 w-5 text-white" />
                  </span>
                  <div>
                    <div className="whitespace-pre-wrap rounded-xl rounded-tl-[4px] border border-ceramic bg-warm px-4 py-3 text-[15px] leading-relaxed text-ink">
                      {msg.text}
                    </div>
                    {phase === 2 && i === currentMessages.length - 1 && (
                      <button
                        type="button"
                        onClick={skipDeepDive}
                        className="mt-2 text-[13px] text-ink-secondary underline"
                      >
                        スキップ
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}
            {/* 成形の生成途中：項目ができたそばから埋まっていくプレビュー */}
            {streamingShaped && !shaped && <StreamingShapedCard partial={streamingShaped} />}
            {shaped && (
              <ShapedCard
                value={shaped}
                onChange={setShaped}
                onSave={() => void saveRecord()}
                saving={saving}
              />
            )}
            {sending && !streamingShaped && <ThinkingBubble tone="record" />}
          </div>
        )}
      </div>

      {/* 書くヒント＋入力バー（下部固定） */}
      <div className="flex-none px-4 pb-3">
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
        {phase === 1 && !limitReached && (
          <div className="pb-2.5">
            <p className="text-[13px] font-semibold text-ink-secondary">
              書くヒント
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {hints.map((hint) => (
                <span
                  key={hint}
                  className="rounded bg-leaf px-2 py-[3px] text-xs text-primary"
                >
                  {hint}
                </span>
              ))}
            </div>
          </div>
        )}
        <ChatInputBar
          serif
          mic
          disabled={sending || phase === 3 || limitReached}
          placeholder={phase === 1 ? "今日のことを自由に..." : "答えを入力..."}
          maxLength={MAX_DIARY_LENGTH}
          onSend={handleSend}
          onTypingChange={setHasDraft}
          actionIcon={<SparklesIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
      </div>
    </main>
  );
}
