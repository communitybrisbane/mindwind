"use client";

import { useState } from "react";
import type { ChatSummary } from "@/components/ChatHistoryDrawer";
import type { RefThought } from "@/components/RefThoughts";
import { authedFetch, authedJson, type AppUser } from "@/lib/db/useUser";
import { MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";

export type Message = { role: "user" | "assistant"; text: string; refs?: RefThought[] };

type ConsultEvent =
  | { type: "meta"; chatId: string }
  | { type: "refs"; refs: RefThought[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error" };

/** 相談チャットの状態と操作（スレッド・メッセージ・ストリーミング受信・履歴） */
export function useConsultChat(user: AppUser | null) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // スレッド見出しの日付（新規=今日、履歴から開いたら最終更新日）
  const [threadDate, setThreadDate] = useState<string>(() => new Date().toISOString());
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [thinking, setThinking] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // タブを開いたときは常に新規相談から始める（過去のスレッドは履歴ドロワーから開く）

  /** 履歴一覧を読み込む（失敗時は空） */
  async function loadChats() {
    if (!user) return;
    const res = await authedFetch(user, "/api/chats");
    setChats(res.ok ? (await res.json()).chats : []);
  }

  async function openChat(id: string) {
    if (!user) return;
    const res = await authedFetch(user, `/api/chats/${id}`);
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

  /** 履歴ドロワーからスレッドを開く（見出しの日付は最終更新日） */
  function selectChat(id: string) {
    void openChat(id);
    const summary = chats.find((c) => c.id === id);
    if (summary?.updatedAt) setThreadDate(summary.updatedAt);
  }

  function startNewChat() {
    setChatId(null);
    setMessages([]);
    setThreadDate(new Date().toISOString());
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

  function addAssistantMessage(text: string) {
    setMessages((m) => [...m, { role: "assistant", text }]);
  }

  /** ndjson ストリームを読みながら AI バブルへ逐次反映する */
  async function readConsultStream(body: ReadableStream<Uint8Array>) {
    let refs: RefThought[] = [];
    let started = false;
    let failed = false;
    await readNdjson(body, (event) => {
      const data = event as ConsultEvent;
      if (data.type === "meta") setChatId(data.chatId);
      else if (data.type === "refs") refs = data.refs;
      else if (data.type === "delta") {
        if (!started) {
          started = true;
          setThinking(false);
          addAssistantMessage("");
        }
        updateLastAssistant((msg) => ({ ...msg, text: msg.text + data.text }));
      } else if (data.type === "done") {
        updateLastAssistant((msg) => ({ ...msg, refs: refs.length ? refs : undefined }));
      } else if (data.type === "error") {
        failed = true;
      }
    });
    if (failed && !started) throw new Error("consult stream error");
    if (failed) {
      updateLastAssistant((msg) => ({ ...msg, text: msg.text + "\n\n（途中で途切れてしまいました）" }));
    }
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
      if (res.status === 404) {
        setChatId(null);
        setMessages([
          {
            role: "assistant",
            text: "このスレッドは削除されたみたい。新しい相談として、もう一度送ってね。",
          },
        ]);
        return;
      }
      if (res.status === 409) {
        const { count } = await res.json();
        addAssistantMessage(
          `まずは${MIN_THOUGHTS_FOR_CONSULT}日分、記録してみましょう（いま${count}件）。記録がたまるほど、過去のあなたが力になれるよ。`
        );
        return;
      }
      if (!res.ok || !res.body) throw new Error(`consult ${res.status}`);
      await readConsultStream(res.body);
    } catch {
      addAssistantMessage("ごめん、うまく応答できなかった。少し待ってからもう一度聞いてみて。");
    } finally {
      setThinking(false);
    }
  }

  return {
    chatId,
    messages,
    threadDate,
    chats,
    thinking,
    limitReached,
    send,
    loadChats,
    selectChat,
    startNewChat,
    deleteChat,
  };
}
