// 過去日付の記録（バックデート）の日付検証。仕様は docs/ARCHITECTURE.md「過去日付の記録」

export type RecordDateResult =
  | { ok: true; date: string; isPast: boolean }
  | { ok: false; reason: "invalid" | "future" };

/**
 * 保存 API の `date` パラメータを解決する。
 * - 未指定・空文字 → 今日（従来動作）
 * - "YYYY-MM-DD" 形式かつ実在する日付のみ受け付ける（"2026-02-30" などは invalid）
 * - 未来日は future として拒否。過去日は isPast: true
 */
export function resolveRecordDate(input: unknown, todayKey: string): RecordDateResult {
  if (input == null || input === "") return { ok: true, date: todayKey, isPast: false };
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { ok: false, reason: "invalid" };
  }
  const [y, m, d] = input.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const exists =
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  if (!exists) return { ok: false, reason: "invalid" };
  // 日付キーはゼロ埋め済みなので文字列比較で大小が判定できる
  if (input > todayKey) return { ok: false, reason: "future" };
  return { ok: true, date: input, isPast: input < todayKey };
}
