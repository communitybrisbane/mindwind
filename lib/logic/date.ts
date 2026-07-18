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

/** Asia/Tokyo での時刻（0〜23）。挨拶の出し分けに使う */
export function tokyoHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TOKYO,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date)
  );
}

/** 時間帯に応じた挨拶 */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return "おはようございます";
  if (hour >= 11 && hour < 18) return "こんにちは";
  return "おつかれさまです";
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

/** 日付キーの Asia/Tokyo 0時を指す Date（日次上限の createdAt 範囲クエリに使う） */
export function tokyoDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+09:00`);
}
