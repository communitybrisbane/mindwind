import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedding";
import { adminDb, verifyUser, verifyUserInfo } from "@/lib/db/admin";
import { toStoredEmbedding } from "@/lib/db/embeddingField";
import { consumeQuota } from "@/lib/db/usage";
import { resolveRecordDate } from "@/lib/logic/backdate";
import { tokyoDateKey } from "@/lib/logic/date";
import { MAX_DIARY_LENGTH, recordLimitFor } from "@/lib/logic/limits";
import { omit } from "@/lib/logic/omit";
import { buildEmbeddingText } from "@/lib/logic/recordText";
import { parseShapedRecord } from "@/lib/logic/shapedRecord";

export const maxDuration = 30;

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
    return { id: doc.id, ...omit(doc.data(), ["embedding", "createdAt"]) };
  });
  return NextResponse.json({ thoughts });
}

export async function POST(req: NextRequest) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid, isGuest } = authInfo;

  const body = await req.json().catch(() => null);
  const shaped = parseShapedRecord(body?.shaped);
  if (!shaped) {
    return NextResponse.json({ error: "invalid shaped record" }, { status: 400 });
  }
  const text = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : "";
  const rawText = text(body?.rawText, MAX_DIARY_LENGTH);
  const deepDiveQuestion = text(body?.deepDiveQuestion, MAX_DIARY_LENGTH);
  const deepDiveAnswer = text(body?.deepDiveAnswer, MAX_DIARY_LENGTH);

  const userDoc = adminDb.doc(`users/${uid}`);
  const thoughts = userDoc.collection("thoughts");
  const todayKey = tokyoDateKey(new Date());

  // 過去日付の記録（バックデート）：未指定なら今日。未来・不正な日付は 400
  const resolved = resolveRecordDate(body?.date, todayKey);
  if (!resolved.ok) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  const { date, isPast } = resolved;

  // 1日の記録上限（書いた日基準・Asia/Tokyo）。AI 呼び出しと同じ原子カウンタで数える。
  // 削除しても枠は戻らない（書き込み回数の上限）。過去日付の記録も「今日書いた1件」
  const quota = await consumeQuota(uid, "record", recordLimitFor(isGuest));
  if (!quota) {
    return NextResponse.json({ error: "daily_limit" }, { status: 409 });
  }

  try {
    const embedding = await embedText(buildEmbeddingText(shaped));
    const docRef = thoughts.doc();

    // 過去日の重複チェック・thought の保存・recordChat の更新を1トランザクションで行う
    // （同じ日の同時保存や、複数端末の同時保存でカードが消えるのを防ぐ）
    const saved = await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userDoc);
      // 過去日は1日1件まで（すでに記録がある日には追記できない。削除→書き直しで対応）
      if (isPast) {
        const taken = await tx.get(thoughts.where("date", "==", date).limit(1));
        if (!taken.empty) return false;
      }

      // recordChat は保存済みカードのみ保持する設計。新しいカードをサーバー側で追記して
      // クライアントの2本目のリクエストをなくす（日付が変わっていたら作り直し）。
      // 過去日モードのセッションは復元対象外なので recordChat には積まない
      if (!isPast) {
        const existing = userSnap.get("recordChat");
        const cards =
          existing?.date === todayKey
            ? existing.messages.filter((m: { type: string }) => m.type === "card")
            : [];
        tx.set(
          userDoc,
          {
            recordChat: {
              date: todayKey,
              messages: [
                ...cards,
                { role: "ai", type: "card", content: JSON.stringify(shaped), thoughtId: docRef.id },
              ],
            },
          },
          { merge: true }
        );
      }
      tx.set(docRef, {
        date,
        ...shaped,
        rawText,
        deepDiveQuestion,
        deepDiveAnswer,
        tags: [],
        embedding: toStoredEmbedding(embedding),
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });

    if (!saved) {
      await quota.refund();
      return NextResponse.json({ error: "date_taken" }, { status: 409 });
    }
    return NextResponse.json({ id: docRef.id });
  } catch (e) {
    console.error("save thought failed:", e);
    await quota.refund();
    return NextResponse.json({ error: "save_failed" }, { status: 502 });
  }
}
