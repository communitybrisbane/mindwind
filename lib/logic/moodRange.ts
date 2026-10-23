// 風の記録の範囲クエリの検証（契約 §4・PLAN 73）。lib/logic/moodDay.ts の validateRange の薄い包み。
import { validateRange } from "@/lib/logic/moodDay";

/**
 * GET /api/moods?from&to のクエリを検証する。
 * 形式（YYYY-MM-DD）・from<=to・366日以内。to が未来なら today に丸める。
 */
export function parseRange(
  from: unknown,
  to: unknown,
  todayKey: string
): { ok: true; from: string; to: string } | { ok: false } {
  return validateRange(from, to, todayKey);
}
