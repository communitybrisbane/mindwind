import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { adminDb, verifyUser } from "@/lib/db/admin";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const diary = typeof body?.diary === "string" ? body.diary.trim() : "";
  // 超短文はクライアントで促す設計（ここは直接叩かれたときのコスト防御）
  if (diary.length < 10) {
    return NextResponse.json({ error: "diary too short" }, { status: 400 });
  }

  const userSnap = await adminDb.doc(`users/${uid}`).get();
  const system = buildSystemPrompt("deepdive", userSnap.get("profile") ?? null);

  try {
    const response = await anthropic.messages.create({
      model: MODELS.deepdive,
      max_tokens: 300,
      // 固定プレフィックス（人格＋profile）をキャッシュし、可変の日記は messages 末尾に置く
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: diary }],
    });

    // refusal や max_tokens 到達などの異常応答は専用エラーで返す（DEVELOPMENT §エラーハンドリング）
    if (response.stop_reason !== "end_turn") {
      return NextResponse.json({ error: "incomplete_response" }, { status: 422 });
    }
    const question = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    if (!question) throw new Error("empty response");

    return NextResponse.json({ question });
  } catch (e) {
    console.error("deepdive failed:", e);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
