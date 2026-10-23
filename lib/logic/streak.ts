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

const DAY_MS = 86_400_000;

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 記録日（日記の日）と気分だけの日の和集合。玉だけの日も1日に数える */
export function unionDays(...sets: Array<Iterable<string>>): Set<string> {
  const out = new Set<string>();
  for (const s of sets) for (const k of s) out.add(k);
  return out;
}

/** 今週（月曜はじまり〜今日）の記録日数。未来日は数えない */
export function weekRecordDays(dates: Iterable<string>, todayKey: string): number {
  const today = keyToUtcMs(todayKey);
  const dow = new Date(today).getUTCDay(); // 0=日
  const monday = today - ((dow + 6) % 7) * DAY_MS;
  let n = 0;
  for (const k of new Set(dates)) {
    const t = keyToUtcMs(k);
    if (t >= monday && t <= today) n++;
  }
  return n;
}

/** 直近の記録からの空き日数（今日なら 0、昨日なら 1）。今日以前の記録がなければ null */
export function daysSinceLastRecord(dates: Iterable<string>, todayKey: string): number | null {
  const today = keyToUtcMs(todayKey);
  let latest: number | null = null;
  for (const k of dates) {
    const t = keyToUtcMs(k);
    if (t <= today && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : Math.round((today - latest) / DAY_MS);
}

/** おかえり判定。間に丸2日以上書かない日があった（空き日数 3 以上）。記録なしは false */
export function isWelcomeBack(dates: Iterable<string>, todayKey: string): boolean {
  const gap = daysSinceLastRecord(dates, todayKey);
  return gap !== null && gap >= 3;
}
