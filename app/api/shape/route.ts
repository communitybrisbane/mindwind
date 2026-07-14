import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { adminDb, verifyUser } from "@/lib/db/admin";
import type { ShapedRecord } from "@/lib/db/types";

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
    values: { type: "string", description: "価値観（AIの推測。断定調にしない）" },
  },
  required: ["title", "event", "thinking", "action", "reason", "emotion", "values"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const diary = typeof body?.diary === "string" ? body.diary.trim() : "";
  // 超短文はクライアントで促す設計（ここは直接叩かれたときのコスト防御）
  if (diary.length < 10) {
    return NextResponse.json({ error: "diary too short" }, { status: 400 });
  }
  const question = typeof body?.deepDiveQuestion === "string" ? body.deepDiveQuestion.trim() : "";
  const answer = typeof body?.deepDiveAnswer === "string" ? body.deepDiveAnswer.trim() : "";

  const userSnap = await adminDb.doc(`users/${uid}`).get();
  const system = buildSystemPrompt("shaping", userSnap.get("profile") ?? null);

  const userContent =
    `【日記】\n${diary}` +
    (question && answer ? `\n\n【深掘り質問】\n${question}\n\n【深掘り回答】\n${answer}` : "");

  try {
    const response = await anthropic.messages.create({
      model: MODELS.shaping,
      max_tokens: 2000,
      // 固定プレフィックス（人格＋profile）をキャッシュし、可変の日記は messages 末尾に置く
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: shapedSchema } },
      messages: [{ role: "user", content: userContent }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const shaped = JSON.parse(text) as ShapedRecord;

    return NextResponse.json({ shaped });
  } catch (e) {
    console.error("shape failed:", e);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
