import { NextRequest, NextResponse } from "next/server";
import type { DeleteAccountResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser } from "@/lib/db/admin";

/**
 * アカウントの Firestore データ全削除（憲法第13条：完全削除）。
 * users/{uid} を recursiveDelete するので、その下のサブコレクション
 * （thoughts・chunks・moods・letters・usage・chats/messages）と旧 recordChat・profile がすべて消える。
 * チャンクのパスは lib/db/chunks.ts の chunkCollectionPath（users/{uid} の下であることを Vitest で確認）。
 * Auth ユーザーの削除はクライアント側（再認証後の deleteUser）で行う。
 */
export async function DELETE(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await adminDb.recursiveDelete(adminDb.doc(`users/${uid}`));
  const res: DeleteAccountResponse = { ok: true };
  return NextResponse.json(res);
}
