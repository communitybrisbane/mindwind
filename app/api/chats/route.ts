import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";

/** 相談スレッドの一覧（更新の新しい順） */
export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await adminDb
    .collection(`users/${uid}/chats`)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  const chats = snap.docs.map((doc) => ({
    id: doc.id,
    title: doc.get("title") ?? "",
    updatedAt: doc.get("updatedAt")?.toDate?.()?.toISOString() ?? null,
  }));
  return NextResponse.json({ chats });
}
