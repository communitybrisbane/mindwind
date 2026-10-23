import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { MIN_THOUGHTS_FOR_CONSULT, searchRelevantThoughts, type RagThought } from "@/lib/ai/rag";
import { adminDb, verifyUserInfo } from "@/lib/db/admin";
import { consumeQuota } from "@/lib/db/usage";
import { ndjsonResponse } from "@/lib/api/ndjson";
import { joinTextBlocks } from "@/lib/ai/text";
import { consultLimitFor, MAX_CONSULT_MESSAGE } from "@/lib/logic/limits";
import { formatShapedFields } from "@/lib/logic/recordText";

export const maxDuration = 300;

// Claude に渡すスレッド履歴の上限（超過分は古い順に外す。画面には全件表示される）
const MAX_HISTORY = 20;

function formatRagBlock(thoughts: RagThought[]): string {
  const entries = thoughts.map((t, i) => {
    return `${i + 1}. ${t.date}「${t.title}」\n${formatShapedFields(t)}`;
  });
  return `【参考：ユーザーの過去の記録（関連順・最大5件）】\n\n${entries.join("\n\n")}`;
}

export async function POST(req: NextRequest) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid, isGuest } = authInfo;

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_CONSULT_MESSAGE) {
    return NextResponse.json({ error: "message length out of range" }, { status: 400 });
  }
  const chatId = typeof body?.chatId === "string" ? body.chatId : null;

  // 1日の相談上限（ゲストは会員の1/10。Asia/Tokyo 日付でリセット。トランザクションで原子的に判定）
  const quota = await consumeQuota(uid, "consult", consultLimitFor(isGuest));
  if (!quota) return NextResponse.json({ error: "daily_limit" }, { status: 429 });

  const userDoc = adminDb.doc(`users/${uid}`);
  let chatRef = chatId ? userDoc.collection("chats").doc(chatId) : null;
  let history: { role: "user" | "assistant"; content: string }[] = [];
  let userSnap;
  let results: RagThought[];
  try {
    // スレッド履歴はサーバー側で読み込む（スレッド間でコンテキストを混ぜない）
    let chatExists = true;
    [userSnap, chatExists, history] = await Promise.all([
      userDoc.get(),
      chatRef ? chatRef.get().then((s) => s.exists) : Promise.resolve(true),
      chatRef
        ? chatRef
            .collection("messages")
            .orderBy("createdAt", "asc")
            .get()
            .then((snap) =>
              snap.docs
                .map((d) => ({
                  role: d.get("role"),
                  content: d.get("content"),
                }))
                .slice(-MAX_HISTORY)
            )
        : Promise.resolve([]),
    ]);
    // 別タブで削除済みのスレッドは、後段の update で落ちる前にここで返す
    if (!chatExists) {
      await quota.refund();
      return NextResponse.json({ error: "chat_not_found" }, { status: 404 });
    }

    // 追い質問で主語が省略される場合に備え、直前のユーザー発言で検索クエリを補完する
    const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
    const searchQuery = lastUserMessage ? `${lastUserMessage.content}\n${message}` : message;

    // 記録3件未満なら分析せず案内（コールドスタートガード）
    const found = await searchRelevantThoughts(uid, searchQuery);
    if (found.count < MIN_THOUGHTS_FOR_CONSULT) {
      await quota.refund();
      return NextResponse.json(
        { error: "not_enough_records", count: found.count },
        { status: 409 }
      );
    }
    results = found.results;
  } catch (e) {
    console.error("consult prepare failed:", e);
    await quota.refund();
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
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
              {
                type: "text" as const,
                text: m.content,
                cache_control: { type: "ephemeral" as const },
              },
            ],
          }
        : { role: m.role, content: m.content }
    ),
    {
      role: "user" as const,
      // 末尾のリマインダー：履歴に長い返答が並んでいても直近の指示が勝つ（画面・保存履歴には出ない）
      content: `${formatRagBlock(results)}\n\n【相談】\n${message}\n\n（返答は200字以内で）`,
    },
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

  return ndjsonResponse(async (push) => {
    let saved = false;
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
      const answer = joinTextBlocks(final.content);

      // 履歴保存（画面を離れても復元できるように）
      const messagesCol = chatRef.collection("messages");
      await messagesCol.add({
        role: "user",
        content: message,
        createdAt: FieldValue.serverTimestamp(),
      });
      await messagesCol.add({
        role: "assistant",
        content: answer,
        refs,
        createdAt: FieldValue.serverTimestamp(),
      });
      await chatRef.update({ updatedAt: FieldValue.serverTimestamp() });
      saved = true;

      push({ type: "done" });
    } catch (e) {
      console.error("consult failed:", e);
      // 回答が保存済みなら成功扱い（枠は返さない）
      if (!saved) await quota.refund();
      push({ type: "error" });
    }
  });
}
