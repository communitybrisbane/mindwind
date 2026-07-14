"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatInputBar from "@/components/ChatInputBar";
import { requestToast } from "@/components/Toast";
import ShapedCard from "@/components/ShapedCard";
import { BlocksIcon, SparklesIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, useUser } from "@/lib/db/useUser";
import type { ShapedRecord } from "@/lib/db/types";
import { formatDateHeading } from "@/lib/logic/date";

type Message =
  | { role: "user" | "ai"; kind: "text"; text: string }
  | { role: "ai"; kind: "card"; shaped: ShapedRecord; thoughtId: string };

// recordChat（Firestore）の保存形式
type StoredMessage = {
  role: "user" | "ai";
  type: "text" | "card";
  content: string;
  thoughtId?: string;
};

function toStored(messages: Message[]): StoredMessage[] {
  return messages.map((m) =>
    m.kind === "card"
      ? { role: "ai", type: "card", content: JSON.stringify(m.shaped), thoughtId: m.thoughtId }
      : { role: m.role, type: "text", content: m.text }
  );
}

function fromStored(stored: StoredMessage[]): Message[] {
  return stored.flatMap((m): Message[] => {
    if (m.type === "card") {
      try {
        return [
          { role: "ai", kind: "card", shaped: JSON.parse(m.content), thoughtId: m.thoughtId ?? "" },
        ];
      } catch {
        return [];
      }
    }
    return [{ role: m.role, kind: "text", text: m.content }];
  });
}

const DAILY_LIMIT = 3;

// 記録フェーズ：1=日記 2=深掘り 3=成形
type Phase = 1 | 2 | 3;

const phaseSubtitles: Record<Phase, string> = {
  1: "今日のこと",
  2: "もう少しだけ",
  3: "今日の記録",
};

const hints = ["何があった？", "どう考えた？", "どう動いた？", "なぜそうした？", "今どんな気持ち？"];

export default function RecordPage() {
  const router = useRouter();
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [diaryText, setDiaryText] = useState("");
  const [deepDiveQuestion, setDeepDiveQuestion] = useState("");
  const [deepDiveAnswer, setDeepDiveAnswer] = useState("");
  const [shaped, setShaped] = useState<ShapedRecord | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // 当日の記録チャットを復元（日付が変わっていればサーバーが null を返し空状態から始まる）
  useEffect(() => {
    if (!user) return;
    authedFetch(user, "/api/record-chat")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.recordChat?.messages) setMessages(fromStored(data.recordChat.messages));
      })
      .catch(() => {});
  }, [user]);

  // 保存済みのやり取りはタイトルだけのチップに畳み、進行中のメッセージだけをチャットに出す
  const savedRecords = messages.filter((m) => m.kind === "card");
  let lastCardIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].kind === "card") {
      lastCardIndex = i;
      break;
    }
  }
  const currentMessages = messages.slice(lastCardIndex + 1);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  // 空状態の案内は「まだ何もない」ときだけ（入力を始めたら・今日すでに記録があるときは出さない）
  const showEmptyState = currentMessages.length === 0 && savedRecords.length === 0 && !hasDraft;

  const limitReached = savedRecords.length >= DAILY_LIMIT;

  async function sendDiary(text: string) {
    if (!user) return;
    // 超短文は AI を呼ばずにやさしく促す（「疲れた。しんどい。」程度の短い日記は通す）
    if (text.trim().length < 10) {
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
      const res = await authedFetch(user, "/api/deepdive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary: text }),
      });
      if (!res.ok) throw new Error(`deepdive ${res.status}`);
      const { question } = await res.json();
      setDeepDiveQuestion(question);
      setMessages((m) => [...m, { role: "ai", kind: "text", text: question }]);
      setPhase(2);
    } catch {
      setError("質問を用意できませんでした。少し待ってからもう一度送ってみてください。");
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
        { role: "ai", kind: "text", text: "今日の記録を整理したよ。違うところは直してね。" },
      ]);
      setShaped(data.shaped);
    } catch {
      setError("記録を整理できませんでした。少し待ってからもう一度試してください。");
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
      const res = await authedFetch(user, "/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shaped,
          rawText: diaryText,
          deepDiveQuestion: deepDiveAnswer ? deepDiveQuestion : "",
          deepDiveAnswer,
        }),
      });
      if (res.status === 409) {
        setError("今日の記録は上限（3件）に達しました");
        return;
      }
      if (!res.ok) throw new Error(`thoughts ${res.status}`);
      const { id } = await res.json();

      // 保存済みカードを含む当日チャットを recordChat に保存（翌日以降は破棄される）
      const savedMessages: Message[] = [
        ...messages,
        { role: "ai", kind: "card", shaped, thoughtId: id },
      ];
      await authedFetch(user, "/api/record-chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toStored(savedMessages) }),
      }).catch(() => {});

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
    if (!window.confirm("この記録を削除しますか？ 削除すると元に戻せません。")) return;
    setError("");
    try {
      const res = await authedFetch(user, `/api/thoughts/${thoughtId}`, { method: "DELETE" });
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
      setExpandedRecord(null);
    } catch {
      setError("削除できませんでした。少し待ってからもう一度試してください。");
    }
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
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        {/* 保存済み記録（畳んだチップ。タップで展開） */}
        {savedRecords.length > 0 && (
          <div className="flex flex-none flex-col gap-2 pt-3">
            {savedRecords.map((record, i) => (
              <div key={i}>
                <button
                  type="button"
                  aria-expanded={expandedRecord === i}
                  onClick={() => setExpandedRecord(expandedRecord === i ? null : i)}
                  className="flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-left shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12l6 6L20 6" />
                  </svg>
                  <span className="flex-1 truncate text-sm font-medium text-ink">
                    {record.kind === "card" ? record.shaped.title : ""}
                  </span>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 flex-none text-ink-tertiary transition-transform ${expandedRecord === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {expandedRecord === i && record.kind === "card" && (
                  <div className="mt-2">
                    <ShapedCard value={record.shaped} readOnly />
                    <button
                      type="button"
                      onClick={() => void deleteRecord(record.thoughtId)}
                      className="mx-auto mt-2 block text-[13px] text-error underline"
                    >
                      この記録を削除する
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {currentMessages.length === 0 ? (
          showEmptyState && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <BlocksIcon className="h-16 w-16 text-accent" strokeWidth={1.2} />
              <p className="mt-5 text-lg font-semibold text-ink">今日のことを話してみよう</p>
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
              )
            )}
            {shaped && (
              <ShapedCard
                value={shaped}
                onChange={setShaped}
                onSave={() => void saveRecord()}
                saving={saving}
              />
            )}
          </div>
        )}
      </div>

      {/* 書くヒント＋入力バー（下部固定） */}
      <div className="flex-none px-4 pb-3">
        {limitReached && (
          <p className="pb-2 text-[13px] text-ink-secondary">
            今日の記録は上限（3件）に達しました
          </p>
        )}
        {phase === 1 && !limitReached && (
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
          disabled={sending || phase === 3 || limitReached}
          placeholder={phase === 1 ? "今日のことを自由に..." : "答えを入力..."}
          onSend={handleSend}
          onTypingChange={setHasDraft}
          actionIcon={<SparklesIcon className="h-[18px] w-[18px]" />}
          actionAriaLabel="送信する"
        />
        {sending && <p className="pt-1.5 text-[13px] text-ink-secondary">分析中...</p>}
      </div>
    </main>
  );
}
