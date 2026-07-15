import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedding";
import { adminDb, verifyUser, verifyUserInfo } from "@/lib/db/admin";
import type { ShapedRecord } from "@/lib/db/types";
import { tokyoDateKey } from "@/lib/logic/date";
import { recordLimitFor } from "@/lib/logic/limits";
import { buildEmbeddingText } from "@/lib/logic/recordText";

export const maxDuration = 30;

const shapedKeys = ["title", "event", "thinking", "action", "reason", "emotion", "values"] as const;

/** 記録一覧（新しい順・embedding は返さない）。ホームのストリーク/カレンダー/最近の記録で使う */
export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ストリーク・カレンダーの正確性のため十分に大きく取る（1日30件×1年でも余裕）
  const snap = await adminDb
    .collection(`users/${uid}/thoughts`)
    .orderBy("createdAt", "desc")
    .limit(2000)
    .get();

  const thoughts = snap.docs.map((doc) => {
    const { embedding: _embedding, createdAt: _createdAt, ...rest } = doc.data();
    return { id: doc.id, ...rest };
  });
  return NextResponse.json({ thoughts });
}

export async function POST(req: NextRequest) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid, isGuest } = authInfo;

  const body = await req.json().catch(() => null);
  const shaped = body?.shaped as ShapedRecord | undefined;
  if (!shaped || shapedKeys.some((key) => typeof shaped[key] !== "string" || !shaped[key].trim())) {
    return NextResponse.json({ error: "invalid shaped record" }, { status: 400 });
  }
  const rawText = typeof body?.rawText === "string" ? body.rawText : "";
  const deepDiveQuestion = typeof body?.deepDiveQuestion === "string" ? body.deepDiveQuestion : "";
  const deepDiveAnswer = typeof body?.deepDiveAnswer === "string" ? body.deepDiveAnswer : "";

  const thoughts = adminDb.collection(`users/${uid}/thoughts`);
  const date = tokyoDateKey(new Date());

  // 1日の記録上限（Asia/Tokyo 日付境界。上限値は lib/logic/limits.ts で一元管理）
  const todayCount = (await thoughts.where("date", "==", date).count().get()).data().count;
  if (todayCount >= recordLimitFor(isGuest)) {
    return NextResponse.json({ error: "daily_limit" }, { status: 409 });
  }

  try {
    const embedding = await embedText(buildEmbeddingText(shaped));
    const doc = await thoughts.add({
      date,
      title: shaped.title,
      event: shaped.event,
      thinking: shaped.thinking,
      action: shaped.action,
      reason: shaped.reason,
      emotion: shaped.emotion,
      values: shaped.values,
      rawText,
      deepDiveQuestion,
      deepDiveAnswer,
      tags: [],
      embedding,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: doc.id });
  } catch (e) {
    console.error("save thought failed:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 502 });
  }
}
