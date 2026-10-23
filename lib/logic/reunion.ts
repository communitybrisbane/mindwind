// 再会カードの選定（AI は使わない）。本人の記録はそのまま返す。
import type { ThoughtSummary } from "@/lib/db/types";
import { MIN_THOUGHTS_FOR_REUNION } from "./limits";

export type ReunionLabel = "1週間前のあなた" | "1か月前のあなた" | "最初に書いた日のあなた";

type Dated = Pick<ThoughtSummary, "id" | "date">;

const DAY_MS = 86_400_000;

function shiftDate(dateKey: string, days: number): string {
  const t = Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * 7日前／30日前（±1日は可。ちょうどの日を優先）／最初に書いた日の順に探す。
 * 記録が MIN_THOUGHTS_FOR_REUNION 件未満なら null。lastShownId の記録は避け、他に無ければ null。
 */
export function pickReunion<T extends Dated = ThoughtSummary>(
  thoughts: T[],
  todayKey: string,
  lastShownId: string | null
): { thought: T; label: ReunionLabel } | null {
  if (thoughts.length < MIN_THOUGHTS_FOR_REUNION) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return null;

  const past = thoughts.filter((t) => t.date < todayKey && t.id !== lastShownId);
  if (past.length === 0) return null;

  // 同じ日の中は id 順で安定させる
  const onDay = (key: string) =>
    past.filter((t) => t.date === key).sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const near = (days: number): T | undefined => {
    for (const off of [0, -1, 1]) {
      const hit = onDay(shiftDate(todayKey, -days + off));
      if (hit) return hit;
    }
    return undefined;
  };

  const week = near(7);
  if (week) return { thought: week, label: "1週間前のあなた" };
  const month = near(30);
  if (month) return { thought: month, label: "1か月前のあなた" };

  // 最初に書いた日（全記録の中の最古の日。その日の記録が lastShownId なら他の同日分、無ければ次候補なし）
  const firstDate = thoughts.reduce((m, t) => (t.date < m ? t.date : m), thoughts[0].date);
  if (firstDate >= todayKey) return null;
  const first = onDay(firstDate);
  return first ? { thought: first, label: "最初に書いた日のあなた" } : null;
}
