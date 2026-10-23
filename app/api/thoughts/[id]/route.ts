import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedding";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { toStoredEmbedding } from "@/lib/db/embeddingField";
import type { StoredMessage } from "@/lib/logic/recordChatMessages";
import { buildEmbeddingText } from "@/lib/logic/recordText";
import { parseShapedRecord } from "@/lib/logic/shapedRecord";

export const maxDuration = 30;

/** 保存済み記録の編集（6項目＋タイトル）。編集後のテキストで embedding を作り直す。
 *  date / rawText / deepDive は変更しない（日付や原文は編集対象外） */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const shaped = parseShapedRecord(body?.shaped);
  if (!shaped) {
    return NextResponse.json({ error: "invalid shaped record" }, { status: 400 });
  }

  const { id } = await params;
  const userDoc = adminDb.doc(`users/${uid}`);
  const docRef = userDoc.collection("thoughts").doc(id);

  try {
    const embedding = await embedText(buildEmbeddingText(shaped));

    // thought の更新と recordChat の同期を1トランザクションで行う（同時編集での巻き戻り防止）
    const found = await adminDb.runTransaction(async (tx) => {
      const [snap, userSnap] = await Promise.all([tx.get(docRef), tx.get(userDoc)]);
      if (!snap.exists) return false;

      tx.update(docRef, { ...shaped, embedding: toStoredEmbedding(embedding) });

      // 今日のしおり（recordChat のカード）に同じ記録があれば内容を同期する
      const recordChat = userSnap.get("recordChat");
      if (recordChat?.messages?.some((m: StoredMessage) => m.thoughtId === id)) {
        const messages = (recordChat.messages as StoredMessage[]).map((m) =>
          m.thoughtId === id ? { ...m, content: JSON.stringify(shaped) } : m
        );
        tx.set(userDoc, { recordChat: { date: recordChat.date, messages } }, { merge: true });
      }
      return true;
    });
    if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update thought failed:", e);
    return NextResponse.json({ error: "update_failed" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const userDoc = adminDb.doc(`users/${uid}`);
  const docRef = userDoc.collection("thoughts").doc(id);

  // thought の削除と recordChat の書き換えを1トランザクションで行う
  await adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userDoc);
    tx.delete(docRef);

    // recordChat からも該当セッション（前カード直後〜このカードまで）を取り除く
    const recordChat = userSnap.get("recordChat");
    if (recordChat?.messages) {
      const kept: StoredMessage[] = [];
      let buffer: StoredMessage[] = [];
      for (const message of recordChat.messages as StoredMessage[]) {
        buffer.push(message);
        if (message.type === "card") {
          if (message.thoughtId !== id) kept.push(...buffer);
          buffer = [];
        }
      }
      kept.push(...buffer);
      tx.set(userDoc, { recordChat: { date: recordChat.date, messages: kept } }, { merge: true });
    }
  });

  return NextResponse.json({ ok: true });
}
