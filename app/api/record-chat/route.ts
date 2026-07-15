import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { tokyoDateKey } from "@/lib/logic/date";

// 当日の記録チャット（復元用・ベクトル化しない）。日付が変わったら無効。
// 書き込みは記録保存 API（POST /api/thoughts）と削除 API がサーバー側で行うため GET のみ

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await adminDb.doc(`users/${uid}`).get();
  const recordChat = snap.get("recordChat");
  if (!recordChat || recordChat.date !== tokyoDateKey(new Date())) {
    return NextResponse.json({ recordChat: null });
  }
  return NextResponse.json({ recordChat });
}

