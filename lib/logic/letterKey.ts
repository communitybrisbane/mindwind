// 手紙のキー（users/{uid}/letters/{weekKey}）と開けられる期間の判定
import { MIN_THOUGHTS_FOR_LETTER } from "./limits";
import { addDays, dayOfWeek, weekRange } from "./week";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 週キーとして正しいか（実在する日付で、月曜であること） */
export function isWeekKey(value: unknown): value is string {
  if (typeof value !== "string" || !KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return false;
  return date.getUTCDay() === 1;
}

/** 今日が日曜か（手紙を新しく開けられる日） */
export function isLetterDay(todayKey: string): boolean {
  return dayOfWeek(todayKey) === 0;
}

/** その週の手紙を今日開ける（生成できる）か。日曜〜翌土曜 */
export function isLetterOpenable(weekKey: string, todayKey: string): boolean {
  const { to } = weekRange(weekKey);
  return todayKey >= to && todayKey <= addDays(to, 6);
}

/** 記録のある日数が手紙を書くのに足りるか */
export function hasEnoughForLetter(recordDays: number): boolean {
  return recordDays >= MIN_THOUGHTS_FOR_LETTER;
}

/** 手紙のドキュメント ID（週キーそのもの。不正なら null） */
export function letterDocId(weekKey: unknown): string | null {
  return isWeekKey(weekKey) ? weekKey : null;
}
