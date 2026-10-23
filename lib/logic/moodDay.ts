// 気分の日次ロジック（PLAN 61）。日付はすべて Asia/Tokyo の "YYYY-MM-DD" キーで扱う。
// 暦の計算は UTC の Date で行い、タイムゾーンのずれを持ち込まない。
import { tokyoDateKey } from "./date";
import { isMoodId, type MoodId } from "./moods";

export const MAX_RANGE_DAYS = 366;

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 実在する日付キーか */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = KEY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toUtc(key: string): Date {
  const m = KEY_RE.exec(key)!;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUtc(d: Date): string {
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 日付キーに days 日足す（負も可） */
export function addDays(key: string, days: number): string {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** from から to までの日数（両端含む）。to < from なら 0 以下 */
export function daysInclusive(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86400000) + 1;
}

/** 日付キー→気分（0〜4）の記録を検証して、有効な行だけを返す。不正な行は捨てる */
export function sanitizeMoodMap(input: unknown): Record<string, MoodId> {
  const out: Record<string, MoodId> = {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (isDateKey(k) && isMoodId(v)) out[k] = v;
  }
  return out;
}

/** その日の最初の起動か（この端末で今日まだ回転盤を出していない）。promptedOn は localStorage の値 */
export function isFirstLaunchOfDay(promptedOn: string | null | undefined, todayKey: string): boolean {
  return promptedOn !== todayKey;
}

/** 現在時刻から見た「今日」のキー（Asia/Tokyo） */
export function todayKeyOf(now: Date = new Date()): string {
  return tokyoDateKey(now);
}

/** 記録あり＝thoughts ∪ moods（玉だけの日も1日に数える） */
export function recordedDays(thoughtDates: Iterable<string>, moodDates: Iterable<string>): Set<string> {
  const s = new Set<string>();
  for (const d of thoughtDates) s.add(d);
  for (const d of moodDates) s.add(d);
  return s;
}

/** その週の月曜（月曜はじまり） */
export function mondayOf(key: string): string {
  const dow = toUtc(key).getUTCDay(); // 0=日
  return addDays(key, -((dow + 6) % 7));
}

export type WeekCell = {
  date: string;
  mood: MoodId | null;
  isToday: boolean;
  isFuture: boolean;
};

/** 今週の帯：月曜はじまり7日分。未来の日は mood を null にする */
export function weekStrip(todayKey: string, moods: Record<string, MoodId>): WeekCell[] {
  const monday = mondayOf(todayKey);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const isFuture = date > todayKey;
    return {
      date,
      mood: isFuture ? null : (moods[date] ?? null),
      isToday: date === todayKey,
      isFuture,
    };
  });
}

/** 月曜はじまりの月カレンダー行列。日付キー、月外の枠は null。month は 1〜12 */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = fromUtc(new Date(Date.UTC(year, month - 1, 1)));
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (toUtc(first).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 0; d < count; d++) cells.push(addDays(first, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** 年のビュー：12か月×31日。存在しない日（2/30 など）は null。行＝月、列＝日 */
export function yearMatrix(year: number): (string | null)[][] {
  return Array.from({ length: 12 }, (_, mi) => {
    const count = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate();
    const first = fromUtc(new Date(Date.UTC(year, mi, 1)));
    return Array.from({ length: 31 }, (_, d) => (d < count ? addDays(first, d) : null));
  });
}

/** 範囲の検証：形式・from<=to・最大 366 日（1年）。to が未来なら today に丸める。丸めて from>to になれば不正 */
export function validateRange(
  from: unknown,
  to: unknown,
  todayKey: string
): { ok: true; from: string; to: string } | { ok: false } {
  if (!isDateKey(from) || !isDateKey(to)) return { ok: false };
  if (from > to) return { ok: false };
  if (daysInclusive(from, to) > MAX_RANGE_DAYS) return { ok: false };
  const clamped = to > todayKey ? todayKey : to;
  if (from > clamped) return { ok: false };
  return { ok: true, from, to: clamped };
}
