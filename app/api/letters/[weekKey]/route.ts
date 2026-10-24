// 1通の手紙（PLAN 77。契約 §6）。GET＝読む／PUT { read: true }＝既読にする／DELETE＝消す（完全削除。憲法第13条）
// 読めるのは届いた手紙（status "ready"）だけ。週キーが正しくないものは 404。
import { NextRequest, NextResponse } from "next/server";
import type { DeleteLetterResponse, LetterResponse, MarkLetterReadResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { deleteLetter, getLetter, markLetterRead } from "@/lib/db/letterStore";
import { letterDocId } from "@/lib/logic/letterKey";

type Params = { params: Promise<{ weekKey: string }> };

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export async function GET(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const weekKey = letterDocId((await params).weekKey);
  if (!weekKey) return notFound();
  const letter = await getLetter(adminDb, uid, weekKey);
  if (!letter || letter.status !== "ready") return notFound();
  const body: LetterResponse = { letter };
  return NextResponse.json(body);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.read !== true) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const weekKey = letterDocId((await params).weekKey);
  if (!weekKey) return notFound();
  if (!(await markLetterRead(adminDb, uid, weekKey))) return notFound();
  const res: MarkLetterReadResponse = { ok: true };
  return NextResponse.json(res);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const weekKey = letterDocId((await params).weekKey);
  if (!weekKey) return notFound();
  if (!(await deleteLetter(adminDb, uid, weekKey))) return notFound();
  const res: DeleteLetterResponse = { ok: true };
  return NextResponse.json(res);
}
