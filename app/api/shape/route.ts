import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { adminDb, verifyUserInfo } from "@/lib/db/admin";
import { consumeQuota } from "@/lib/db/usage";
import { ndjsonResponse } from "@/lib/api/ndjson";
import { joinTextBlocks } from "@/lib/ai/text";
import type { ShapedRecord } from "@/lib/db/types";
import { MAX_DIARY_LENGTH, MIN_DIARY_LENGTH, shapeLimitFor } from "@/lib/logic/limits";

export const maxDuration = 60;

const shapedSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "タイトル（15文字以内・体言止め）" },
    event: { type: "string", description: "出来事" },
    thinking: { type: "string", description: "思考" },
    action: { type: "string", description: "行動" },
    reason: { type: "string", description: "理由" },
    emotion: { type: "string", description: "感情" },
    values: {
      type: "string",
      description: "価値観（AIの推測。断定調にしない）",
    },
  },
  required: ["title", "event", "thinking", "action", "reason", "emotion", "values"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid, isGuest } = authInfo;

  const body = await req.json().catch(() => null);
  const diary = typeof body?.diary === "string" ? body.diary.trim() : "";
  // 超短文はクライアントで促す設計（ここは直接叩かれたときのコスト防御）
  if (diary.length < MIN_DIARY_LENGTH || diary.length > MAX_DIARY_LENGTH) {
    return NextResponse.json({ error: "diary length out of range" }, { status: 400 });
  }
  const question = typeof body?.deepDiveQuestion === "string" ? body.deepDiveQuestion.trim() : "";
  const answer = typeof body?.deepDiveAnswer === "string" ? body.deepDiveAnswer.trim() : "";
  if (question.length > MAX_DIARY_LENGTH || answer.length > MAX_DIARY_LENGTH) {
    return NextResponse.json({ error: "input too long" }, { status: 400 });
  }

  // 1日の成形上限（ゲストは会員の1/10）。Anthropic を呼ぶ前に消費し、失敗時は返す
  const quota = await consumeQuota(uid, "shape", shapeLimitFor(isGuest));
  if (!quota) return NextResponse.json({ error: "daily_limit" }, { status: 429 });

  let system: string;
  try {
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    system = buildSystemPrompt("shaping", userSnap.get("profile") ?? null);
  } catch (e) {
    console.error("shape profile load failed:", e);
    await quota.refund();
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }

  const userContent =
    `【日記】\n${diary}` +
    (question && answer ? `\n\n【深掘り質問】\n${question}\n\n【深掘り回答】\n${answer}` : "");

  // ストリーミングで返す：クライアントは JSON の生成途中から項目をカードに埋めていく
  return ndjsonResponse(async (push) => {
    try {
      const claudeStream = anthropic.messages.stream({
        model: MODELS.shaping,
        max_tokens: 2000,
        // 固定プレフィックス（人格＋profile）をキャッシュし、可変の日記は messages 末尾に置く
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        // effort: "low" で思考を抑えて高速化（分類タスクには十分。ARCHITECTURE の仕様通り）
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: shapedSchema },
        },
        messages: [{ role: "user", content: userContent }],
      });
      claudeStream.on("text", (delta) => push({ type: "delta", text: delta }));
      const final = await claudeStream.finalMessage();

      // refusal や max_tokens 到達などの異常応答（DEVELOPMENT §エラーハンドリング）
      if (final.stop_reason !== "end_turn") {
        await quota.refund();
        push({ type: "incomplete" });
        return;
      }
      const text = joinTextBlocks(final.content);
      // 最終値はサーバーで完全な JSON をパースして送る（クライアントの部分パースは表示専用）
      push({ type: "shaped", shaped: JSON.parse(text) as ShapedRecord });
      push({ type: "done" });
    } catch (e) {
      console.error("shape failed:", e);
      await quota.refund();
      push({ type: "error" });
    }
  });
}
