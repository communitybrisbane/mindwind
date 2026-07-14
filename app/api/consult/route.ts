import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { MIN_THOUGHTS_FOR_CONSULT, searchRelevantThoughts, type RagThought } from "@/lib/ai/rag";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { SHAPED_FIELDS } from "@/lib/db/types";
import { tokyoDateKey } from "@/lib/logic/date";

export const maxDuration = 300;

// Claude に渡すスレッド履歴の上限（超過分は古い順に外す。画面には全件表示される）
const MAX_HISTORY = 20;
// 1日の相談上限（メッセージ数）
const DAILY_LIMIT = 30;

function formatRagBlock(thoughts: RagThought[]): string {
  const entries = thoughts.map((t, i) => {
    const fields = SHAPED_FIELDS.map(
      ({ key, label }) => `${label.replace("（AIの気づき）", "")}：${t[key]}`
    ).join("\n");
    return `${i + 1}. ${t.date}「${t.title}」\n${fields}`;
  });
  return `【参考：ユーザーの過去の記録（関連順・最大5件）】\n\n${entries.join("\n\n")}`;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
  const chatId = typeof body?.chatId === "string" ? body.chatId : null;

  const userDoc = adminDb.doc(`users/${uid}`);
  const userSnap = await userDoc.get();

  // 1日30メッセージの上限（Asia/Tokyo 日付でリセット）
  const today = tokyoDateKey(new Date());
  const consultCount = userSnap.get("consultCount");
  const usedToday: number = consultCount?.date === today ? consultCount.count : 0;
  if (usedToday >= DAILY_LIMIT) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  // スレッド履歴はサーバー側で読み込む（スレッド間でコンテキストを混ぜない）
  let chatRef = chatId ? userDoc.collection("chats").doc(chatId) : null;
  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (chatRef) {
    const snap = await chatRef.collection("messages").orderBy("createdAt", "asc").get();
    history = snap.docs
      .map((d) => ({ role: d.get("role"), content: d.get("content") }))
      .slice(-MAX_HISTORY);
  }

  // 追い質問で主語が省略される場合に備え、直前のユーザー発言で検索クエリを補完する
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  const searchQuery = lastUserMessage ? `${lastUserMessage.content}\n${message}` : message;

  // 記録3件未満なら分析せず案内（コールドスタートガード）
  const { count, results } = await searchRelevantThoughts(uid, searchQuery);
  if (count < MIN_THOUGHTS_FOR_CONSULT) {
    return NextResponse.json({ error: "not_enough_records", count }, { status: 409 });
  }

  const system = buildSystemPrompt("consult", userSnap.get("profile") ?? null);

  // 固定プレフィックス（人格＋profile＋スレッド履歴）をキャッシュし、
  // 可変部分（RAG 記録＋新しい質問）は必ず messages の末尾に置く
  const messages = [
    ...history.map((m, i) =>
      i === history.length - 1
        ? {
            role: m.role,
            content: [
              { type: "text" as const, text: m.content, cache_control: { type: "ephemeral" as const } },
            ],
          }
        : { role: m.role, content: m.content }
    ),
    { role: "user" as const, content: `${formatRagBlock(results)}\n\n【相談】\n${message}` },
  ];

  // 参考記録は表示用スナップショットとして保存する（元記録が消えても履歴の表示が壊れない）
  const refs = results.map((t) => ({
    id: t.id,
    date: t.date,
    title: t.title,
    event: t.event,
    thinking: t.thinking,
    action: t.action,
    reason: t.reason,
    emotion: t.emotion,
    values: t.values,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      try {
        // スレッドがなければ作成（タイトルは最初の質問から）
        if (!chatRef) {
          chatRef = userDoc.collection("chats").doc();
          await chatRef.set({
            title: message.slice(0, 25),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        push({ type: "meta", chatId: chatRef.id });
        push({ type: "refs", refs });

        const claudeStream = anthropic.messages.stream({
          model: MODELS.consult,
          max_tokens: 4000,
          // Opus 4.8 は省略すると thinking オフになるため明示する
          thinking: { type: "adaptive" },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages,
        });
        claudeStream.on("text", (delta) => push({ type: "delta", text: delta }));
        const final = await claudeStream.finalMessage();
        const answer = final.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");

        // 履歴保存（画面を離れても復元できるように）＋上限カウント
        const messagesCol = chatRef.collection("messages");
        await messagesCol.add({ role: "user", content: message, createdAt: FieldValue.serverTimestamp() });
        await messagesCol.add({ role: "assistant", content: answer, refs, createdAt: FieldValue.serverTimestamp() });
        await chatRef.update({ updatedAt: FieldValue.serverTimestamp() });
        await userDoc.set({ consultCount: { date: today, count: usedToday + 1 } }, { merge: true });

        push({ type: "done" });
      } catch (e) {
        console.error("consult failed:", e);
        push({ type: "error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
