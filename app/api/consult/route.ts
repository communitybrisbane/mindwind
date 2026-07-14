import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { MIN_THOUGHTS_FOR_CONSULT, searchRelevantThoughts, type RagThought } from "@/lib/ai/rag";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { SHAPED_FIELDS } from "@/lib/db/types";

export const maxDuration = 300;

// Claude に渡すスレッド履歴の上限（超過分は古い順に外す。画面には全件表示される）
const MAX_HISTORY = 20;

type HistoryMessage = { role: "user" | "assistant"; content: string };

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
  const history: HistoryMessage[] = Array.isArray(body?.history)
    ? body.history
        .filter(
          (m: HistoryMessage) =>
            (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        )
        .slice(-MAX_HISTORY)
    : [];

  // 追い質問で主語が省略される場合に備え、直前のユーザー発言で検索クエリを補完する
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  const searchQuery = lastUserMessage ? `${lastUserMessage.content}\n${message}` : message;

  // 記録3件未満なら分析せず案内（コールドスタートガード）
  const { count, results } = await searchRelevantThoughts(uid, searchQuery);
  if (count < MIN_THOUGHTS_FOR_CONSULT) {
    return NextResponse.json({ error: "not_enough_records", count }, { status: 409 });
  }

  const userSnap = await adminDb.doc(`users/${uid}`).get();
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
        await claudeStream.finalMessage();
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
