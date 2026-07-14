import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";

type StoredMessage = { role: string; type: string; content: string; thoughtId?: string };

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
