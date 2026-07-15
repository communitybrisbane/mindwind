"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ChatHistoryDrawer, { type ChatSummary } from "@/components/ChatHistoryDrawer";
import ChatInputBar from "@/components/ChatInputBar";
import RefThoughts, { type RefThought } from "@/components/RefThoughts";
import ThinkingBubble from "@/components/ThinkingBubble";
import { ClockIcon, PlusIcon, SendIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, authedJson, useUser, type AppUser } from "@/lib/db/useUser";
import { MAX_CONSULT_MESSAGE, MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";

type Message = { role: "user" | "assistant"; text: string; refs?: RefThought[] };

const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-full border border-input-border bg-white text-accent";

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
      const res = await authedJson(user, "POST", "/api/consult", { message: text, chatId });
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
      let refs: RefThought[] = [];
      let started = false;
      let failed = false;
      await readNdjson(res.body, (event) => {
        const data = event as
          | { type: "meta"; chatId: string }
          | { type: "refs"; refs: RefThought[] }
          | { type: "delta"; text: string }
          | { type: "done" }
          | { type: "error" };
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
      });
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
          <ClockIcon className="h-[18px] w-[18px]" />
        </button>
        <button type="button" aria-label="新しい相談" className={iconButtonClass} onClick={startNewChat}>
          <PlusIcon className="h-[18px] w-[18px]" />
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
                    <div className="whitespace-pre-wrap rounded-xl rounded-tl-[4px] bg-white px-4 py-3 text-[15px] leading-[1.6] text-ink shadow-card">
                      {msg.text}
                    </div>
                    {msg.refs && <RefThoughts refs={msg.refs} />}
                  </div>
                </div>
              )
            )}
            {thinking && <ThinkingBubble tone="consult" />}
          </div>
        )}
      </div>

      {/* 入力バー（下部固定） */}
      <div className="flex-none px-4 pb-3">
        {limitReached &&
          (user?.isGuest ? (
            <p className="pb-2 text-[13px] text-ink-secondary">
              今日のゲストの上限に達しました。
              <Link href="/onboarding?edit=1" className="font-semibold text-accent underline">
                Google アカウントと連携
              </Link>
              するともっと相談できます
            </p>
          ) : (
            <p className="pb-2 text-[13px] text-ink-secondary">
              今日の相談はここまで。また明日話そう
            </p>
          ))}
        <ChatInputBar
          mic
          disabled={thinking || limitReached}
          placeholder={messages.length === 0 ? "なんでも聞いてみよう" : "過去の自分に相談しよう"}
          maxLength={MAX_CONSULT_MESSAGE}
          onSend={send}
          actionIcon={<SendIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
      </div>

      {/* 相談履歴ドロワー（左からスライドイン） */}
      {drawerOpen && (
        <ChatHistoryDrawer
          chats={chats}
          currentChatId={chatId}
          onSelect={(id) => {
            if (user) void openChat(user, id);
            setDrawerOpen(false);
          }}
          onDelete={(id) => void deleteChat(id)}
          onNewChat={startNewChat}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </main>
  );
}
