"use client";

import { useState } from "react";
import { showToast } from "@/components/ui/Toast";
import { authedFetch, authedJson, type AppUser } from "@/lib/db/useUser";
import { MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";
import { readNdjson } from "@/lib/logic/ndjson";

/** 「読み返したページ」1枚。新形式は quote（検索で当たったチャンクの本文）。
 *  旧形式（成形6項目のスナップショット）の履歴も表示できるよう、旧フィールドは任意で残す。
 *  元の記録が消されると id と日付だけになり deleted: true（憲法第13条） */
export type RefPage = {
  id: string;
  date: string;
  title?: string;
  quote?: string;
  deleted?: boolean;
  event?: string;
  thinking?: string;
  action?: string;
  reason?: string;
  emotion?: string;
  values?: string;
};

export type ChatSummary = { id: string; title: string; updatedAt: string | null };

export type Message = {
  role: "user" | "assistant";
  text: string;
  refs?: RefPage[];
  /** 返事がまだ書かれている途中（緑インクのキャレットを出す） */
  streaming?: boolean;
};

type ConsultEvent =
  | { type: "meta"; chatId: string }
  | { type: "refs"; refs: RefPage[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error" };

/** 相談（文通）の状態と操作：スレッド・メッセージ・ストリーミング受信・履歴・削除・上限 */
export function useConsultChat(user: AppUser | null) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // タブを開いたときは常に新しい相談から（過去のスレッドは「これまでの相談」から開く）

  /** 履歴一覧を読み込む（失敗時は空） */
  async function loadChats() {
    if (!user) return;
    setChatsLoading(true);
    try {
      const res = await authedFetch(user, "/api/chats");
      setChats(res.ok ? (await res.json()).chats : []);
    } catch {
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  }

  /** スレッドを開く。失敗したら false */
  async function selectChat(id: string): Promise<boolean> {
    if (!user) return false;
    try {
      const res = await authedFetch(user, `/api/chats/${id}`);
      if (!res.ok) return false;
      const data = await res.json();
      setChatId(id);
      setMessages(
        (data.messages as Array<{ role: Message["role"]; content: string; refs?: RefPage[] }>).map(
          (m) => ({
            role: m.role,
            text: m.content,
            refs: m.refs?.length ? m.refs : undefined,
          }),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  function startNewChat() {
    setChatId(null);
    setMessages([]);
  }

  /** スレッドを完全に削除する（確認は呼び出し側のダイアログで済ませてから呼ぶ）。失敗したら false */
  async function deleteChat(id: string): Promise<boolean> {
    if (!user) return false;
    try {
      const res = await authedFetch(user, `/api/chats/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      setChats((c) => c.filter((chat) => chat.id !== id));
      if (chatId === id) {
        setChatId(null);
        setMessages([]);
      }
      return true;
    } catch {
      return false;
    }
  }

  /** 最後の assistant メッセージを更新する（ストリーミング反映用） */
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

  /** NDJSON を読みながら便箋に1文字ずつ書いていく */
  async function readConsultStream(body: ReadableStream<Uint8Array>) {
    let refs: RefPage[] = [];
    let started = false;
    let failed = false;
    try {
      await readNdjson(body, (event) => {
        const data = event as ConsultEvent;
        if (data.type === "meta") setChatId(data.chatId);
        else if (data.type === "refs") refs = Array.isArray(data.refs) ? data.refs : [];
        else if (data.type === "delta") {
          if (!started) {
            started = true;
            setThinking(false);
            setStreaming(true);
            setMessages((m) => [...m, { role: "assistant", text: "", streaming: true }]);
          }
          updateLastAssistant((msg) => ({ ...msg, text: msg.text + data.text }));
        } else if (data.type === "done") {
          updateLastAssistant((msg) => ({
            ...msg,
            streaming: false,
            refs: refs.length ? refs : undefined,
          }));
        } else if (data.type === "error") {
          failed = true;
        }
      });
    } catch {
      failed = true;
    } finally {
      setStreaming(false);
    }
    if (failed && !started) throw new Error("consult stream error");
    if (failed) {
      updateLastAssistant((msg) => ({
        ...msg,
        streaming: false,
        text: msg.text + "\n\n（途中で途切れてしまいました）",
      }));
    }
  }

  /** 問いを送る。送れなかったとき（上限・送信中）は false */
  async function send(text: string): Promise<boolean> {
    if (!user || thinking || streaming || limitReached) return false;
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    try {
      const res = await authedJson(user, "POST", "/api/consult", { message: text, chatId });
      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setMessages((m) => m.slice(0, -1));
        // IP のレート制限（rate_limited）は1日の上限ではないので、入力欄は閉じない
        if (body?.error === "rate_limited") {
          showToast("少し待ってから、もう一度送ってね");
          return false;
        }
        setLimitReached(true);
        return false;
      }
      if (res.status === 404) {
        setChatId(null);
        setMessages([
          {
            role: "assistant",
            text: "このスレッドは削除されたみたい。新しい相談として、もう一度送ってね。",
          },
        ]);
        return true;
      }
      if (res.status === 409) {
        const { count } = await res.json();
        addAssistantMessage(
          `まずは${MIN_THOUGHTS_FOR_CONSULT}日分、記録してみましょう（いま${count}件）。記録がたまるほど、過去のあなたが力になれるよ。`,
        );
        return true;
      }
      if (!res.ok || !res.body) throw new Error(`consult ${res.status}`);
      await readConsultStream(res.body);
      return true;
    } catch {
      addAssistantMessage("ごめん、うまく応答できなかった。少し待ってからもう一度聞いてみて。");
      return true;
    } finally {
      setThinking(false);
    }
  }

  return {
    chatId,
    messages,
    chats,
    chatsLoading,
    thinking,
    streaming,
    limitReached,
    send,
    loadChats,
    selectChat,
    startNewChat,
    deleteChat,
  };
}
