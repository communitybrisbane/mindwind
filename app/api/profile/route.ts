import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { STAGES, type Profile, type Stage } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await adminDb.doc(`users/${uid}`).get();
  return NextResponse.json({ profile: snap.get("profile") ?? null });
}

export async function PUT(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const text = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const profile: Profile = {
    nickname: text(body.nickname, 30),
    activity: text(body.activity, 60),
    stage: STAGES.includes(body.stage) ? (body.stage as Stage) : null,
    goal: text(body.goal, 200),
  };

  await adminDb.doc(`users/${uid}`).set({ profile }, { merge: true });
  return NextResponse.json({ profile });
}
