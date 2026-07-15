import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";

/** アカウントの Firestore データ全削除（profile / thoughts / chats / recordChat）。
 *  Auth ユーザーの削除はクライアント側（再認証後の deleteUser）で行う */
export async function DELETE(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await adminDb.recursiveDelete(adminDb.doc(`users/${uid}`));
  return NextResponse.json({ ok: true });
}
