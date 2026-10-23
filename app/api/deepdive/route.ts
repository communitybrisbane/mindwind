import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { adminDb, verifyUserInfo } from "@/lib/db/admin";
import { consumeQuota } from "@/lib/db/usage";
import { joinTextBlocks } from "@/lib/ai/text";
import { deepdiveLimitFor, MAX_DIARY_LENGTH, MIN_DIARY_LENGTH } from "@/lib/logic/limits";

export const maxDuration = 30;

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

  // 1日の深掘り上限（ゲストは会員の1/10）。Anthropic を呼ぶ前に消費し、失敗時は返す
  const quota = await consumeQuota(uid, "deepdive", deepdiveLimitFor(isGuest));
  if (!quota) return NextResponse.json({ error: "daily_limit" }, { status: 429 });

  try {
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    const system = buildSystemPrompt("deepdive", userSnap.get("profile") ?? null);

    const response = await anthropic.messages.create({
      model: MODELS.deepdive,
      max_tokens: 300,
      // 固定プレフィックス（人格＋profile）をキャッシュし、可変の日記は messages 末尾に置く
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: diary }],
    });

    // refusal や max_tokens 到達などの異常応答は専用エラーで返す（DEVELOPMENT §エラーハンドリング）
    if (response.stop_reason !== "end_turn") {
      await quota.refund();
      return NextResponse.json({ error: "incomplete_response" }, { status: 422 });
    }
    const question = joinTextBlocks(response.content).trim();
    if (!question) throw new Error("empty response");

    return NextResponse.json({ question });
  } catch (e) {
    console.error("deepdive failed:", e);
    await quota.refund();
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
