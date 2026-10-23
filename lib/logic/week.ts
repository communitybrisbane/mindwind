// 週の境界（Asia/Tokyo・月曜はじまり）。日付キーは "YYYY-MM-DD"（暦の日付なので UTC 計算で足りる）

const DAY_MS = 86_400_000;

function toMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** その日の曜日（0=日〜6=土） */
export function dayOfWeek(dateKey: string): number {
  return new Date(toMs(dateKey)).getUTCDay();
}

/** 日付キーに days 日を足したキー（負も可） */
export function addDays(dateKey: string, days: number): string {
  return toKey(toMs(dateKey) + days * DAY_MS);
}

/** その日を含む週の月曜（週キー） */
export function weekKeyFor(dateKey: string): string {
  return addDays(dateKey, -((dayOfWeek(dateKey) + 6) % 7));
}

/** 週キー（月曜）→ 月曜〜日曜 */
export function weekRange(weekKey: string): { from: string; to: string } {
  return { from: weekKey, to: addDays(weekKey, 6) };
}

/** 週キー → 7日分（月〜日） */
export function weekDates(weekKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekKey, i));
}

/** 今日に対して手紙の対象になる週。日曜ならその週、月〜土なら前の週（日曜に開けて翌土曜まで読める） */
export function letterWeekFor(todayKey: string): string {
  const thisWeek = weekKeyFor(todayKey);
  return dayOfWeek(todayKey) === 0 ? thisWeek : addDays(thisWeek, -7);
}
