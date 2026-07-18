import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedding";
import { adminDb, verifyUser } from "@/lib/db/admin";
import type { ShapedRecord } from "@/lib/db/types";
import { MAX_SHAPED_FIELD, MAX_TITLE_LENGTH } from "@/lib/logic/limits";
import { buildEmbeddingText } from "@/lib/logic/recordText";

export const maxDuration = 30;

type StoredMessage = { role: string; type: string; content: string; thoughtId?: string };

const shapedKeys = ["title", "event", "thinking", "action", "reason", "emotion", "values"] as const;

/** 保存済み記録の編集（6項目＋タイトル）。編集後のテキストで embedding を作り直す。
 *  date / rawText / deepDive は変更しない（日付や原文は編集対象外） */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  const { id } = await params;
  const userDoc = adminDb.doc(`users/${uid}`);
  const docRef = userDoc.collection("thoughts").doc(id);

  try {
    const [snap, embedding] = await Promise.all([
      docRef.get(),
      embedText(buildEmbeddingText(shaped)),
    ]);
    if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await docRef.update({
      title: shaped.title,
      event: shaped.event,
      thinking: shaped.thinking,
      action: shaped.action,
      reason: shaped.reason,
      emotion: shaped.emotion,
      values: shaped.values,
      embedding,
    });

    // 今日のしおり（recordChat のカード）に同じ記録があれば内容を同期する
    const recordChat = (await userDoc.get()).get("recordChat");
    if (recordChat?.messages?.some((m: StoredMessage) => m.thoughtId === id)) {
      const messages = (recordChat.messages as StoredMessage[]).map((m) =>
        m.thoughtId === id ? { ...m, content: JSON.stringify(shaped) } : m
      );
      await userDoc.set({ recordChat: { date: recordChat.date, messages } }, { merge: true });
    }

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
  await userDoc.collection("thoughts").doc(id).delete();

  // recordChat からも該当セッション（前カード直後〜このカードまで）を取り除く
  const recordChat = (await userDoc.get()).get("recordChat");
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
    await userDoc.set({ recordChat: { date: recordChat.date, messages: kept } }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
