// カレンダーの月グリッド（日曜始まり）。日付キーは Asia/Tokyo の "YYYY-MM-DD"

/** "YYYY-MM-DD" の日付キーを組み立てる（month は 1〜12） */
export function buildDateKey(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** 日付キーから {year, month} を取り出す */
export function parseYearMonth(dateKey: string): { year: number; month: number } {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month };
}

/** 月を delta ぶん前後させる */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * 月のグリッド（週ごとの配列・日曜始まり）。月外のマスは null。
 * 例：2026年7月は水曜始まりなので1週目は [null, null, null, 1, 2, 3, 4]
 */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (number | null)[] = Array<number | null>(firstDow).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
