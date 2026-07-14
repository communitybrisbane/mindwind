import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { tokyoDateKey } from "@/lib/logic/date";

// 当日の記録チャット（復元用・ベクトル化しない）。日付が変わったら無効
type StoredMessage = {
  role: "user" | "ai";
  type: "text" | "card";
  content: string;
  thoughtId?: string;
};

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

export async function PUT(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const messages = body?.messages;
  const valid =
    Array.isArray(messages) &&
    messages.length <= 60 &&
    messages.every(
      (m: StoredMessage) =>
        (m.role === "user" || m.role === "ai") &&
        (m.type === "text" || m.type === "card") &&
        typeof m.content === "string" &&
        m.content.length <= 20000 &&
        (m.thoughtId === undefined || typeof m.thoughtId === "string")
    );
  if (!valid) return NextResponse.json({ error: "invalid messages" }, { status: 400 });

  const recordChat = { date: tokyoDateKey(new Date()), messages };
  await adminDb.doc(`users/${uid}`).set({ recordChat }, { merge: true });
  return NextResponse.json({ ok: true });
}
