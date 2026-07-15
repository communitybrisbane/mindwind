"use client";

import { useEffect, useRef, useState } from "react";
import ChatInputBar from "@/components/ChatInputBar";
import RefThoughts, { type RefThought } from "@/components/RefThoughts";
import { SendIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, useUser, type AppUser } from "@/lib/db/useUser";
import { MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";

type Message = { role: "user" | "assistant"; text: string; refs?: RefThought[] };
type ChatSummary = { id: string; title: string; updatedAt: string | null };

const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full border border-input-border bg-white text-accent";

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SearchPage() {
  const { user } = useUser();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [thinking, setThinking] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // 最新スレッドを復元（画面を離れて戻ってきても表示される）
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const list = await fetchChats(user);
        setChats(list);
        if (list.length > 0) await openChat(user, list[0].id);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchChats(u: AppUser): Promise<ChatSummary[]> {
    const res = await authedFetch(u, "/api/chats");
    if (!res.ok) return [];
    return (await res.json()).chats;
  }

  async function openChat(u: AppUser, id: string) {
    const res = await authedFetch(u, `/api/chats/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setChatId(id);
    setMessages(
      data.messages.map((m: { role: Message["role"]; content: string; refs: RefThought[] }) => ({
        role: m.role,
        text: m.content,
        refs: m.refs?.length ? m.refs : undefined,
      }))
    );
  }

  function startNewChat() {
    setChatId(null);
    setMessages([]);
    setDrawerOpen(false);
  }

  async function deleteChat(id: string) {
    if (!user) return;
    if (!window.confirm("この相談履歴を削除しますか？ 削除すると元に戻せません。")) return;
    try {
      const res = await authedFetch(user, `/api/chats/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      setChats((c) => c.filter((chat) => chat.id !== id));
      if (chatId === id) {
        setChatId(null);
        setMessages([]);
      }
    } catch {
      window.alert("削除できませんでした。少し待ってからもう一度試してください。");
    }
  }

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
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    try {
      const res = await authedFetch(user, "/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, chatId }),
      });
      if (res.status === 429) {
        setLimitReached(true);
        setMessages((m) => m.slice(0, -1));
        return;
      }
      if (res.status === 409) {
        const { count } = await res.json();
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: `まずは${MIN_THOUGHTS_FOR_CONSULT}日分、記録してみましょう（いま${count}件）。記録がたまるほど、過去のあなたが力になれるよ。`,
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
          if (data.type === "meta") setChatId(data.chatId);
          else if (data.type === "refs") refs = data.refs;
          else if (data.type === "delta") {
            if (!started) {
              started = true;
              setThinking(false);
              setMessages((m) => [...m, { role: "assistant", text: "" }]);
            }
            updateLastAssistant((msg) => ({ ...msg, text: msg.text + data.text }));
          } else if (data.type === "done") {
            updateLastAssistant((msg) => ({ ...msg, refs: refs.length ? refs : undefined }));
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
        <button
          type="button"
          aria-label="相談履歴"
          className={iconButtonClass}
          onClick={async () => {
            setDrawerOpen(true);
            if (user) setChats(await fetchChats(user));
          }}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
        <button type="button" aria-label="新しい相談" className={iconButtonClass} onClick={startNewChat}>
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
        {limitReached && (
          <p className="pb-2 text-[13px] text-ink-secondary">今日の相談はここまで。また明日話そう</p>
        )}
        <ChatInputBar
          mic
          disabled={thinking || limitReached}
          placeholder={messages.length === 0 ? "なんでも聞いてみよう" : "過去の自分に相談しよう"}
          onSend={send}
          actionIcon={<SendIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
      </div>

      {/* 相談履歴ドロワー（左からスライドイン） */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 flex justify-center bg-black/40"
          onClick={() => setDrawerOpen(false)}
        >
          {/* アプリシェル幅に合わせてドロワーを左端に出す */}
          <div className="flex h-full w-full max-w-[430px] justify-start">
          <div
            className="flex h-full w-[78%] max-w-[335px] flex-col bg-warm p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-white"
            >
              ＋ 新しい相談
            </button>
            <h2 className="mt-5 text-[13px] font-semibold text-ink-secondary">相談履歴</h2>
            <ul className="mt-2 flex-1 overflow-y-auto">
              {chats.length === 0 && (
                <li className="py-3 text-sm text-ink-secondary">まだ相談履歴がありません</li>
              )}
              {chats.map((chat) => (
                <li key={chat.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (user) void openChat(user, chat.id);
                      setDrawerOpen(false);
                    }}
                    className={`flex min-h-11 flex-1 items-center gap-2 rounded-lg px-2.5 text-left ${
                      chat.id === chatId ? "bg-leaf" : ""
                    }`}
                  >
                    <span className="flex-1 truncate text-sm text-ink">{chat.title}</span>
                    <span className="flex-none text-xs text-ink-tertiary">
                      {formatUpdatedAt(chat.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="この相談履歴を削除"
                    onClick={() => void deleteChat(chat.id)}
                    className="flex h-8 w-8 flex-none items-center justify-center text-ink-tertiary"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      )}

    </main>
  );
}
