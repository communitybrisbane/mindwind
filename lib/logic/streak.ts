// ストリーク（連続記録日数）計算。日付キーは Asia/Tokyo の "YYYY-MM-DD"

/** 日付キーの前日を返す */
export function prevDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * 連続記録日数。今日を終点に数え、今日まだ書いていない場合は昨日までの連続を維持して返す
 * （0時を過ぎた瞬間にストリークが消える体験を避ける）。
 */
export function calcStreak(recordedDateKeys: Iterable<string>, todayKey: string): number {
  const days = new Set(recordedDateKeys);
  let day = days.has(todayKey) ? todayKey : prevDateKey(todayKey);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = prevDateKey(day);
  }
  return streak;
}
