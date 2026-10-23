// 気分の玉の保存と読み出し（サーバー専用。PLAN 62・73）。
// users/{uid}/moods/{YYYY-MM-DD} = { mood: 0-4, updatedAt, changes }。日付はサーバーが Asia/Tokyo で決める。
// Firestore は引数で受け取る（admin.ts を import しないので Vitest で偽物を渡して試せる）。
// クライアントからは import しない（firebase-admin を読み込むため）。型だけなら import type で可。
// 気分は RAG に入れない・AI も呼ばない。
import { FieldPath, type Firestore } from "firebase-admin/firestore";
import type { DayEntry } from "@/lib/db/types";
import { addDays, daysInclusive, sanitizeMoodMap } from "@/lib/logic/moodDay";
import { isMoodId, type MoodId } from "@/lib/logic/moods";

/**
 * 日次ガード：1日に気分を選び直せる回数の上限（同じ玉を選び直したときは数えない）。
 * 回転盤の「選び直す」とホームの今日の輪からの選び直しに十分な余裕を持たせ、連打・スクリプトだけを止める。
 */
export const MAX_MOOD_CHANGES_PER_DAY = 30;

/** PUT /api/mood の本文を検証する。0〜4 の整数でなければ null */
export function parsePutMoodBody(body: unknown): MoodId | null {
  if (typeof body !== "object" || body === null) return null;
  const mood = (body as { mood?: unknown }).mood;
  return isMoodId(mood) ? mood : null;
}

/**
 * PUT /api/mood は今日のみ。本文に date が来たら今日と一致するときだけ許す（省略は今日）。
 * 過去日・未来日の気分はサーバーで書かない。
 */
export function isTodayOnly(body: unknown, todayKey: string): boolean {
  if (typeof body !== "object" || body === null) return true;
  const date = (body as { date?: unknown }).date;
  return date === undefined || date === todayKey;
}

// GET /api/moods のクエリの検証は lib/logic/moodRange.ts の parseRange（契約 §4）

/**
 * 範囲の1日ずつを埋めて返す（両端含む・日付順）。無い日は mood:null・records:0。
 * thoughtDates は thoughts の date を1件ずつ（同じ日が複数あればその件数が records になる）。
 */
export function buildDayEntries(
  from: string,
  to: string,
  moods: Record<string, MoodId>,
  thoughtDates: Iterable<string>
): DayEntry[] {
  const counts = new Map<string, number>();
  for (const d of thoughtDates) counts.set(d, (counts.get(d) ?? 0) + 1);
  const n = daysInclusive(from, to);
  const days: DayEntry[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(from, i);
    days.push({ date, mood: moods[date] ?? null, records: counts.get(date) ?? 0 });
  }
  return days;
}

/** 選び直しの判定（純粋）。同じ玉なら書かない。上限に達していれば拒む */
export function decideMoodWrite(
  current: { mood: unknown; changes: unknown } | null,
  next: MoodId
): { write: false; limited: false } | { write: false; limited: true } | { write: true; changes: number } {
  const changes =
    typeof current?.changes === "number" && Number.isFinite(current.changes) ? current.changes : 0;
  if (current && current.mood === next) return { write: false, limited: false };
  if (changes >= MAX_MOOD_CHANGES_PER_DAY) return { write: false, limited: true };
  return { write: true, changes: changes + 1 };
}

const moodsPath = (uid: string) => `users/${uid}/moods`;

/** 今日（todayKey）の気分。無い・不正な値なら null */
export async function readMood(db: Firestore, uid: string, dateKey: string): Promise<MoodId | null> {
  const snap = await db.doc(`${moodsPath(uid)}/${dateKey}`).get();
  const mood: unknown = snap.exists ? snap.get("mood") : undefined;
  return isMoodId(mood) ? mood : null;
}

/** 今日の気分を保存（同じ日は上書き＝選び直し）。上限超えは limited */
export async function writeTodayMood(
  db: Firestore,
  uid: string,
  todayKey: string,
  mood: MoodId,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; reason: "daily_limit" }> {
  const ref = db.doc(`${moodsPath(uid)}/${todayKey}`);
  const limited = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const decision = decideMoodWrite(
      snap.exists ? { mood: snap.get("mood"), changes: snap.get("changes") } : null,
      mood
    );
    if (decision.write) {
      tx.set(ref, { mood, updatedAt: now, changes: decision.changes });
      return false;
    }
    return decision.limited;
  });
  return limited ? { ok: false, reason: "daily_limit" } : { ok: true };
}

/** 範囲の気分と記録件数（読み取り専用。両端含む）。from/to は lib/logic/moodRange.ts の parseRange を通したもの */
export async function readMoodRange(
  db: Firestore,
  uid: string,
  from: string,
  to: string
): Promise<DayEntry[]> {
  const [moodSnap, thoughtSnap] = await Promise.all([
    db
      .collection(moodsPath(uid))
      .where(FieldPath.documentId(), ">=", from)
      .where(FieldPath.documentId(), "<=", to)
      .get(),
    db
      .collection(`users/${uid}/thoughts`)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .select("date")
      .get(),
  ]);
  const raw: Record<string, unknown> = {};
  for (const doc of moodSnap.docs) raw[doc.id] = doc.get("mood");
  const dates: string[] = [];
  for (const doc of thoughtSnap.docs) {
    const d: unknown = doc.get("date");
    if (typeof d === "string") dates.push(d);
  }
  return buildDayEntries(from, to, sanitizeMoodMap(raw), dates);
}
