// 過去の手紙の一覧（PLAN 77。契約 §6）。届いたものだけ・新しい週が先。本文は返さない
import { NextRequest, NextResponse } from "next/server";
import type { LettersListResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { listLetters } from "@/lib/db/letterStore";

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: LettersListResponse = { letters: await listLetters(adminDb, uid) };
  return NextResponse.json(body);
}
