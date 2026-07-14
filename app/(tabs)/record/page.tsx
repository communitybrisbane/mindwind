"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatInputBar from "@/components/ChatInputBar";
import { BlocksIcon, SparklesIcon } from "@/components/icons";
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
  const [phase, setPhase] = useState<Phase>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 日付はクライアントで確定（サーバーとのハイドレーション差異を避ける）
  const dateHeading = useSyncExternalStore(
    () => () => {},
    () => formatDateHeading(new Date()),
    () => ""
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function sendDiary(text: string) {
    setMessages((m) => [...m, { role: "user", text }]);
    // 深掘り質問（Haiku）の呼び出しはタスク10で接続する
    setPhase(2);
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
                <div
                  key={i}
                  className="mr-auto max-w-[85%] whitespace-pre-wrap rounded-xl rounded-bl-[4px] border border-ceramic bg-warm px-4 py-3 text-[15px] leading-relaxed text-ink"
                >
                  {msg.text}
                </div>
              )
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
          placeholder={phase === 1 ? "今日のことを自由に..." : "答えを入力..."}
          onSend={sendDiary}
          actionIcon={<SparklesIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
      </div>
    </main>
  );
}
