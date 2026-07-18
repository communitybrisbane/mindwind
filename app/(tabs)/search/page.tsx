"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ChatHistoryDrawer, { type ChatSummary } from "@/components/ChatHistoryDrawer";
import ChatInputBar from "@/components/ChatInputBar";
import RefThoughts, { type RefThought } from "@/components/RefThoughts";
import { ClockIcon, PlusIcon, SendIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, authedJson, useUser, type AppUser } from "@/lib/db/useUser";
import { MAX_CONSULT_MESSAGE, MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";

type Message = { role: "user" | "assistant"; text: string; refs?: RefThought[] };

const iconButtonClass =
  "flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(0,98,65,0.08)] text-primary";

/** "2026-07-18" や ISO 文字列 → "7月18日" */
function threadDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}月${get("day")}日`;
}

export default function SearchPage() {
  const { user } = useUser();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // スレッド見出しの日付（新規=今日、履歴から開いたら最終更新日）
  const [threadDate, setThreadDate] = useState<string>(() => new Date().toISOString());
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [thinking, setThinking] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // タブを開いたときは常に新規相談から始める（過去のスレッドは履歴ドロワーから開く）

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
    setThreadDate(new Date().toISOString());
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
    <main className="flex min-h-0 flex-1 flex-col bg-[#f7f4ec]">
      {/* ヘッダー行（小ラベル＋丸ボタン。便箋スタイル） */}
      <div className="flex flex-none items-center justify-between px-4 pb-1 pl-6 pt-[18px]">
        <span className="text-[12px] tracking-[0.08em] text-ink-tertiary">MindWind 相談</span>
        <div className="flex gap-2">
          <button type="button" aria-label="新しい相談" className={iconButtonClass} onClick={startNewChat}>
            <PlusIcon className="h-[18px] w-[18px]" />
          </button>
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
        </div>
      </div>

      {/* 便箋（往復書簡）エリア */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
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
          <div className="flex flex-col gap-6 py-3">
            <p className="text-center text-[11px] tracking-[0.2em] text-ink-tertiary">
              — {threadDateLabel(threadDate)}の相談 —
            </p>
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="relative ml-[42px]">
                  <span className="absolute -left-[42px] top-[5px] text-[10px] tracking-[0.14em] text-ink-tertiary">
                    あなた
                  </span>
                  <p className="whitespace-pre-wrap border-l-2 border-house/25 pl-3 font-serif text-[15.5px] leading-[1.85] text-ink">
                    {msg.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="relative pl-[26px]">
                  <span
                    aria-hidden
                    className="absolute left-0 top-[6px] h-[18px] w-[18px] rounded-[50%_50%_50%_4px] border-[1.6px] border-accent opacity-85"
                  />
                  <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.9] text-[#0f5132]">
                    {msg.text}
                  </p>
                  <p className="mt-1.5 text-[10.5px] tracking-[0.14em] text-ink-tertiary">
                    メンターの返事
                  </p>
                  {msg.refs && <RefThoughts refs={msg.refs} />}
                </div>
              )
            )}
            {thinking && (
              <p className="animate-pulse pl-[26px] font-serif text-[14.5px] leading-[1.9] text-accent">
                記録を読み返している…
              </p>
            )}
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
          serif
          paper
          disabled={thinking || limitReached}
          placeholder={messages.length === 0 ? "なんでも聞いてみよう" : "続きを話す…"}
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
            const summary = chats.find((c) => c.id === id);
            if (summary?.updatedAt) setThreadDate(summary.updatedAt);
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
