"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatInputBar from "@/components/ChatInputBar";
import ShapedCard from "@/components/ShapedCard";
import { BlocksIcon, SparklesIcon } from "@/components/icons";
import { authedFetch, useUser } from "@/lib/db/useUser";
import type { ShapedRecord } from "@/lib/db/types";
import { formatDateHeading } from "@/lib/logic/date";

type Message = { role: "user" | "ai"; text: string };

// 記録フェーズ：1=日記 2=深掘り 3=成形
type Phase = 1 | 2 | 3;

const phaseSubtitles: Record<Phase, string> = {
  1: "今日のこと",
  2: "もう少しだけ",
  3: "今日の記録",
};

const hints = ["何があった？", "どう考えた？", "どう動いた？", "なぜそうした？", "今どんな気持ち？"];

export default function RecordPage() {
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [diaryText, setDiaryText] = useState("");
  const [deepDiveQuestion, setDeepDiveQuestion] = useState("");
  const [shaped, setShaped] = useState<ShapedRecord | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 日付はクライアントで確定（サーバーとのハイドレーション差異を避ける）
  const dateHeading = useSyncExternalStore(
    () => () => {},
    () => formatDateHeading(new Date()),
    () => ""
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, shaped]);

  async function sendDiary(text: string) {
    if (!user) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDiaryText(text);
    setError("");
    setSending(true);
    try {
      const res = await authedFetch(user, "/api/deepdive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary: text }),
      });
      if (!res.ok) throw new Error(`deepdive ${res.status}`);
      const { question } = await res.json();
      setDeepDiveQuestion(question);
      setMessages((m) => [...m, { role: "ai", text: question }]);
      setPhase(2);
    } catch {
      setError("質問を用意できませんでした。少し待ってからもう一度送ってみてください。");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function sendAnswer(text: string) {
    setMessages((m) => [...m, { role: "user", text }]);
    void startShaping(text);
  }

  function skipDeepDive() {
    void startShaping("");
  }

  async function startShaping(answer: string) {
    if (!user) return;
    setPhase(3);
    setError("");
    setSending(true);
    try {
      const res = await authedFetch(user, "/api/shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diary: diaryText,
          deepDiveQuestion: answer ? deepDiveQuestion : "",
          deepDiveAnswer: answer,
        }),
      });
      if (!res.ok) throw new Error(`shape ${res.status}`);
      const data = (await res.json()) as { shaped: ShapedRecord };
      setMessages((m) => [
        ...m,
        { role: "ai", text: "今日の記録を整理したよ。違うところは直してね。" },
      ]);
      setShaped(data.shaped);
    } catch {
      setError("記録を整理できませんでした。少し待ってからもう一度試してください。");
      setPhase(2);
    } finally {
      setSending(false);
    }
  }

  function saveRecord() {
    // 保存処理（embedding→thoughts 保存→/home 遷移）はタスク12で接続する
  }

  function handleSend(text: string) {
    if (phase === 1) void sendDiary(text);
    else if (phase === 2) sendAnswer(text);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* ステップバー（ラベルなし・3本） */}
      <div className="flex flex-none gap-1.5 px-4 pt-3" aria-label={`ステップ${phase}／3`}>
        {([1, 2, 3] as const).map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${step <= phase ? "bg-accent" : "bg-ceramic"}`}
          />
        ))}
      </div>

      {/* 日付見出し（日記帳の質感） */}
      <div className="flex-none px-4 pb-2 pt-4">
        <h1 className="text-[22px] font-semibold text-primary">{dateHeading || " "}</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">{phaseSubtitles[phase]}</p>
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
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <BlocksIcon className="h-16 w-16 text-accent" strokeWidth={1.2} />
            <p className="mt-5 text-lg font-semibold text-ink">今日のことを話してみよう</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              うまくいった日も、そうでない日も。
              <br />
              記録が積み重なるほどパターンが見えてきます
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-3">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-xl rounded-br-[4px] bg-accent px-4 py-3 font-serif text-[15px] leading-relaxed text-white"
                >
                  {msg.text}
                </div>
              ) : (
                <div key={i} className="mr-auto max-w-[85%]">
                  <SparklesIcon className="mb-1 h-4 w-4 text-accent" />
                  <div className="whitespace-pre-wrap rounded-xl rounded-bl-[4px] border border-ceramic bg-warm px-4 py-3 text-[15px] leading-relaxed text-ink">
                    {msg.text}
                  </div>
                  {phase === 2 && i === messages.length - 1 && (
                    <button
                      type="button"
                      onClick={skipDeepDive}
                      className="mt-2 text-[13px] text-ink-secondary underline"
                    >
                      スキップ
                    </button>
                  )}
                </div>
              )
            )}
            {shaped && (
              <ShapedCard
                value={shaped}
                onChange={setShaped}
                onSave={saveRecord}
              />
            )}
          </div>
        )}
      </div>

      {/* 書くヒント＋入力バー（下部固定） */}
      <div className="flex-none px-4 pb-3">
        {phase === 1 && (
          <div className="pb-2.5">
            <p className="text-[13px] font-semibold text-ink-secondary">書くヒント</p>
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
          disabled={sending || phase === 3}
          placeholder={phase === 1 ? "今日のことを自由に..." : "答えを入力..."}
          onSend={handleSend}
          actionIcon={<SparklesIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
        {sending && <p className="pt-1.5 text-[13px] text-ink-secondary">分析中...</p>}
      </div>
    </main>
  );
}
