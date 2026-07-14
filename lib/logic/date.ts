// Asia/Tokyo 固定の日付ロジック（タイムゾーンは仕様で固定。ARCHITECTURE.md 参照）

const TOKYO = "Asia/Tokyo";

/** "7月14日（火）" 形式の日付見出し */
export function formatDateHeading(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TOKYO,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}月${get("day")}日（${get("weekday")}）`;
}

/** Asia/Tokyo での "YYYY-MM-DD"（日付境界の判定・保存キーに使う） */
export function tokyoDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
