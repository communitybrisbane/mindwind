import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";

/** スレッドのメッセージ一覧（古い順・画面には全件表示する） */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const snap = await adminDb
    .collection(`users/${uid}/chats/${id}/messages`)
    .orderBy("createdAt", "asc")
    .get();

  const messages = snap.docs.map((doc) => ({
    role: doc.get("role"),
    content: doc.get("content"),
    refs: doc.get("refs") ?? [],
  }));
  return NextResponse.json({ messages });
}

/** スレッド削除（メッセージごと） */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const chatRef = adminDb.doc(`users/${uid}/chats/${id}`);
  await adminDb.recursiveDelete(chatRef);
  return NextResponse.json({ ok: true });
}
