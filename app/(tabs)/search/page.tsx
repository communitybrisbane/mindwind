"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ChatHistoryDrawer from "@/components/ChatHistoryDrawer";
import ChatInputBar from "@/components/ChatInputBar";
import RefThoughts from "@/components/RefThoughts";
import { ClockIcon, PlusIcon, SendIcon, SpiralIcon } from "@/components/icons";
import { useUser } from "@/lib/db/useUser";
import { formatMonthDay } from "@/lib/logic/date";
import { MAX_CONSULT_MESSAGE } from "@/lib/logic/limits";
import { useConsultChat } from "./useConsultChat";

const iconButtonClass =
  "flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(0,98,65,0.08)] text-primary";

/** "2026-07-18" や ISO 文字列 → "7月18日"（不正な日付は ""） */
function threadDateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : formatMonthDay(d);
}

export default function SearchPage() {
  const { user } = useUser();
  const {
    chatId,
    messages,
    threadDate,
    chats,
    thinking,
    limitReached,
    send,
    loadChats,
    selectChat,
    startNewChat: resetChat,
    deleteChat,
  } = useConsultChat(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function startNewChat() {
    resetChat();
    setDrawerOpen(false);
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
              await loadChats();
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
            selectChat(id);
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
