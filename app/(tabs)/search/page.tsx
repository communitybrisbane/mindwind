"use client";

import { useEffect, useRef, useState } from "react";
import ChatInputBar from "@/components/ChatInputBar";
import RefThoughts, { type RefThought } from "@/components/RefThoughts";
import { SendIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, useUser } from "@/lib/db/useUser";

type Message = { role: "user" | "assistant"; text: string; refs?: RefThought[] };

const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full border border-input-border bg-white text-accent";

export default function SearchPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  /** 最後の assistant メッセージを更新するヘルパー（ストリーミング反映用） */
  function updateLastAssistant(update: (msg: Message) => Message) {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (!last || last.role !== "assistant") return m;
      return [...m.slice(0, -1), update(last)];
    });
  }

  async function send(text: string) {
    if (!user || thinking) return;
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    try {
      const res = await authedFetch(user, "/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (res.status === 409) {
        const { count } = await res.json();
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: `まずは3日分、記録してみましょう（いま${count}件）。記録がたまるほど、過去のあなたが力になれるよ。`,
          },
        ]);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`consult ${res.status}`);

      // ndjson ストリームを読みながら AI バブルへ逐次反映する
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let refs: RefThought[] = [];
      let started = false;
      let failed = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.type === "refs") refs = data.refs;
          else if (data.type === "delta") {
            if (!started) {
              started = true;
              setThinking(false);
              setMessages((m) => [...m, { role: "assistant", text: "" }]);
            }
            updateLastAssistant((msg) => ({ ...msg, text: msg.text + data.text }));
          } else if (data.type === "done") {
            updateLastAssistant((msg) => ({ ...msg, refs }));
          } else if (data.type === "error") {
            failed = true;
          }
        }
      }
      if (failed && !started) throw new Error("consult stream error");
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "ごめん、うまく応答できなかった。少し待ってからもう一度聞いてみて。",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* ヘッダーアイコン行（見出しテキストなし） */}
      <div className="flex flex-none items-center justify-between px-4 pt-3">
        <button type="button" aria-label="相談履歴" className={iconButtonClass}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
        <button type="button" aria-label="新しい相談" className={iconButtonClass}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* チャットエリア */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <SpiralIcon className="h-10 w-[72px] text-accent" />
            <p className="mt-6 text-lg font-semibold text-ink">過去の自分に相談しよう</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              あなたの記録をもとに、
              <br />
              過去のあなたが一緒に考えます
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-3">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-xl rounded-br-[4px] bg-house px-4 py-3 text-[15px] leading-relaxed text-white"
                >
                  {msg.text}
                </div>
              ) : (
                <div key={i} className="flex max-w-[92%] items-start gap-2">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent">
                    <SpiralIcon className="h-3 w-5 text-white" />
                  </span>
                  <div>
                    <div className="whitespace-pre-wrap rounded-xl rounded-tl-[4px] bg-white px-4 py-3 text-[15px] leading-[1.6] text-ink shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
                      {msg.text}
                    </div>
                    {msg.refs && <RefThoughts refs={msg.refs} />}
                  </div>
                </div>
              )
            )}
            {thinking && (
              <div className="flex max-w-[92%] items-start gap-2">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent">
                  <SpiralIcon className="h-3 w-5 text-white" />
                </span>
                <div className="flex items-center gap-1 rounded-xl rounded-tl-[4px] bg-white px-4 py-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-tertiary"
                      style={{ animationDelay: `${n * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 入力バー（下部固定） */}
      <div className="flex-none px-4 pb-3">
        <ChatInputBar
          mic
          disabled={thinking}
          placeholder={messages.length === 0 ? "なんでも聞いてみよう" : "過去の自分に相談しよう"}
          onSend={send}
          actionIcon={<SendIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
      </div>
    </main>
  );
}
