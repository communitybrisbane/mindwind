import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedding";
import { adminDb, verifyUser, verifyUserInfo } from "@/lib/db/admin";
import type { ShapedRecord } from "@/lib/db/types";
import { tokyoDateKey } from "@/lib/logic/date";
import {
  MAX_DIARY_LENGTH,
  MAX_SHAPED_FIELD,
  MAX_TITLE_LENGTH,
  recordLimitFor,
} from "@/lib/logic/limits";
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
  const fieldValid = (key: (typeof shapedKeys)[number]) => {
    const value = shaped?.[key];
    if (typeof value !== "string" || !value.trim()) return false;
    return value.length <= (key === "title" ? MAX_TITLE_LENGTH : MAX_SHAPED_FIELD);
  };
  if (!shaped || !shapedKeys.every(fieldValid)) {
    return NextResponse.json({ error: "invalid shaped record" }, { status: 400 });
  }
  const text = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : "";
  const rawText = text(body?.rawText, MAX_DIARY_LENGTH);
  const deepDiveQuestion = text(body?.deepDiveQuestion, MAX_DIARY_LENGTH);
  const deepDiveAnswer = text(body?.deepDiveAnswer, MAX_DIARY_LENGTH);

  const userDoc = adminDb.doc(`users/${uid}`);
  const thoughts = userDoc.collection("thoughts");
  const date = tokyoDateKey(new Date());

  try {
    // 独立した処理は並列で走らせて待ち時間を圧縮する
    // （上限超過時は embedding 1回ぶん無駄になるが $0.00001 なので許容）
    const [countSnap, embedding, userSnap] = await Promise.all([
      thoughts.where("date", "==", date).count().get(),
      embedText(buildEmbeddingText(shaped)),
      userDoc.get(),
    ]);

    // 1日の記録上限（Asia/Tokyo 日付境界。上限値は lib/logic/limits.ts で一元管理）
    if (countSnap.data().count >= recordLimitFor(isGuest)) {
      return NextResponse.json({ error: "daily_limit" }, { status: 409 });
    }

    // recordChat は保存済みカードのみ保持する設計。新しいカードをサーバー側で追記して
    // クライアントの2本目のリクエストをなくす（日付が変わっていたら作り直し）
    const docRef = thoughts.doc();
    const existing = userSnap.get("recordChat");
    const cards =
      existing?.date === date
        ? existing.messages.filter((m: { type: string }) => m.type === "card")
        : [];
    const recordChat = {
      date,
      messages: [
        ...cards,
        { role: "ai", type: "card", content: JSON.stringify(shaped), thoughtId: docRef.id },
      ],
    };

    await Promise.all([
      docRef.set({
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
      }),
      userDoc.set({ recordChat }, { merge: true }),
    ]);
    return NextResponse.json({ id: docRef.id });
  } catch (e) {
    console.error("save thought failed:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 502 });
  }
}
