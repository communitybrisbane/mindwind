import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { MIN_THOUGHTS_FOR_CONSULT, searchRelevantThoughts, type RagThought } from "@/lib/ai/rag";
import { adminDb, verifyUserInfo } from "@/lib/db/admin";
import { consumeQuota } from "@/lib/db/usage";
import { ndjsonResponse } from "@/lib/api/ndjson";
import { joinTextBlocks } from "@/lib/ai/text";
import { consultLimitFor, MAX_CONSULT_MESSAGE } from "@/lib/logic/limits";
import { formatRagBlock } from "@/lib/logic/ragChunks";

export const maxDuration = 300;

// Claude に渡すスレッド履歴の上限（超過分は古い順に外す。画面には全件表示される）
const MAX_HISTORY = 20;

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
  let searchLog = "";
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
    searchLog = `embed=${found.timing.embedMs}ms search=${found.timing.searchMs}ms source=${found.source} hits=${results.length}`;
  } catch (e) {
    console.error("consult prepare failed:", e);
    await quota.refund();
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }

  const system = buildSystemPrompt("consult", userSnap.get("profile") ?? null);

  // 固定プレフィックス（人格＋profile＋スレッド履歴）をキャッシュし、
  // 可変部分（RAG 記録＋新しい質問）は必ず messages の末尾に置く。
  // 参考記録は本人の言葉のチャンク＋日付だけ（成形文・meta・題は渡さない）。0件なら「無い」と伝える一行だけ
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

  // 「読み返したページ」の表示用スナップショット（契約 §6：{ id, date, title, quote }）。
  // 記録が消えたら DELETE /api/thoughts/[id] が { id, date, deleted: true } に伏せる（憲法第13条）
  const refs = results.map((t) => ({ id: t.id, date: t.date, title: t.title, quote: t.quote }));

  return ndjsonResponse(async (push) => {
    let saved = false;
    let createdChat: FirebaseFirestore.DocumentReference | null = null;
    const t0 = Date.now();
    let firstTokenAt: number | null = null;
    try {
      // スレッドがなければ作成（タイトルは最初の質問から）。失敗したら最後に消す（空スレッドを残さない）
      if (!chatRef) {
        chatRef = userDoc.collection("chats").doc();
        await chatRef.set({
          title: message.slice(0, 25),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        createdChat = chatRef;
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
      claudeStream.on("text", (delta) => {
        if (firstTokenAt === null) firstTokenAt = Date.now();
        push({ type: "delta", text: delta });
      });
      const final = await claudeStream.finalMessage();
      const answer = joinTextBlocks(final.content);

      // 履歴保存（画面を離れても復元できるように）。問い・返事・更新時刻を1バッチで書く（途中で欠けない）
      // 同じバッチの serverTimestamp は同じ時刻になり orderBy("createdAt") で並びが決まらないので、サーバーの時計で 1ms ずらす
      const messagesCol = chatRef.collection("messages");
      const now = Date.now();
      const batch = adminDb.batch();
      batch.set(messagesCol.doc(), {
        role: "user",
        content: message,
        createdAt: Timestamp.fromMillis(now),
      });
      batch.set(messagesCol.doc(), {
        role: "assistant",
        content: answer,
        refs,
        createdAt: Timestamp.fromMillis(now + 1),
      });
      batch.update(chatRef, { updatedAt: FieldValue.serverTimestamp() });
      await batch.commit();
      saved = true;

      // 計測（PLAN 58）：ベクトル化・検索・最初の文字が出るまで
      const firstMs = firstTokenAt === null ? -1 : firstTokenAt - t0;
      console.info(`[consult] ${searchLog} first_token=${firstMs}ms total=${Date.now() - t0}ms`);

      push({ type: "done" });
    } catch (e) {
      console.error("consult failed:", e);
      // 回答が保存済みなら成功扱い（枠は返さない）
      if (!saved) {
        await quota.refund();
        // この呼び出しで作ったばかりのスレッドは消す（タイトルだけの空スレッドが残らないように）
        if (createdChat) await createdChat.delete().catch(() => {});
      }
      push({ type: "error" });
    }
  });
}
