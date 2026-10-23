import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { emptyProfile, STAGES, type Profile, type Stage } from "@/lib/db/types";
import { MAX_NICKNAME_LENGTH } from "@/lib/logic/limits";

// 自動の呼び名（lib/logic/autoName.ts）はクライアントの表示専用。ここでは保存しない（AI の {{profile}} に入れないため）

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await adminDb.doc(`users/${uid}`).get();
  return NextResponse.json({ profile: snap.get("profile") ?? null });
}

/** PUT：送った項目だけ更新（merge）。nickname は trim して12文字に切る */
export async function PUT(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const text = (v: unknown, max: number) =>
    typeof v === "string" ? Array.from(v.trim()).slice(0, max).join("") : "";
  const patch: Partial<Profile> = {};
  if ("nickname" in body) patch.nickname = text(body.nickname, MAX_NICKNAME_LENGTH);
  if ("activity" in body) patch.activity = text(body.activity, 60);
  if ("goal" in body) patch.goal = text(body.goal, 200);
  if ("stage" in body) patch.stage = STAGES.includes(body.stage) ? (body.stage as Stage) : null;
  if ("hideStreak" in body) patch.hideStreak = body.hideStreak === true;

  const ref = adminDb.doc(`users/${uid}`);
  const snap = await ref.get();
  const profile: Profile = { ...emptyProfile, ...(snap.get("profile") ?? {}), ...patch };
  await ref.set({ profile }, { merge: true });
  return NextResponse.json({ profile });
}
