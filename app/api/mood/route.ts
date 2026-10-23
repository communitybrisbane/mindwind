// 今日の気分（PLAN 62）。GET＝今日の気分（無ければ null）／PUT＝今日の気分を保存・上書き（選び直し）。
// 日付はサーバーが Asia/Tokyo で決める（今日のみ）。AI は呼ばない。
import { NextRequest, NextResponse } from "next/server";
import type { PutMoodResponse, TodayMoodResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser } from "@/lib/db/admin";
import { isTodayOnly, parsePutMoodBody, readMood, writeTodayMood } from "@/lib/db/moodStore";
import { tokyoDateKey } from "@/lib/logic/date";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const date = tokyoDateKey(new Date());
  const mood = await readMood(adminDb, uid, date);
  const body: TodayMoodResponse = { date, mood };
  return NextResponse.json(body, { headers: NO_STORE });
}

export async function PUT(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json: unknown = await req.json().catch(() => null);
  const mood = parsePutMoodBody(json);
  if (mood === null) return NextResponse.json({ error: "invalid_mood" }, { status: 400 });

  const date = tokyoDateKey(new Date());
  if (!isTodayOnly(json, date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const result = await writeTodayMood(adminDb, uid, date, mood);
    if (!result.ok) return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  } catch (e) {
    console.error("mood save failed:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 502 });
  }

  const body: PutMoodResponse = { date, mood };
  return NextResponse.json(body, { headers: NO_STORE });
}
