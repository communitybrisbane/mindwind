// 風の記録の範囲取得（PLAN 73）。GET /api/moods?from=YYYY-MM-DD&to=YYYY-MM-DD
// 両端含む・日付順・最大366日。無い日も { mood: null, records: 0 } で埋める。読み取り専用・AI は呼ばない。
import { NextRequest, NextResponse } from "next/server";
import type { MoodRangeResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { readMoodRange } from "@/lib/db/moodStore";
import { tokyoDateKey } from "@/lib/logic/date";
import { parseRange } from "@/lib/logic/moodRange";

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const range = parseRange(params.get("from"), params.get("to"), tokyoDateKey(new Date()));
  if (!range.ok) return NextResponse.json({ error: "invalid_range" }, { status: 400 });

  const days = await readMoodRange(adminDb, uid, range.from, range.to);
  const body: MoodRangeResponse = { from: range.from, to: range.to, days };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
