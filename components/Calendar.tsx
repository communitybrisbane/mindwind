"use client";

import { useState } from "react";
import { buildDateKey, monthGrid, parseYearMonth, shiftMonth } from "@/lib/logic/calendar";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  /** 記録がある日の日付キー（"YYYY-MM-DD"） */
  recordedDates: Set<string>;
  todayKey: string;
  /** 記録がある日をタップしたとき（その日の記録を表示する） */
  onSelectDate?: (dateKey: string) => void;
};

export default function Calendar({ recordedDates, todayKey, onSelectDate }: Props) {
  const [{ year, month }, setYearMonth] = useState(() => parseYearMonth(todayKey));

  return (
    <section className="rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="前の月"
          onClick={() => setYearMonth((ym) => shiftMonth(ym.year, ym.month, -1))}
          className="flex h-9 w-9 items-center justify-center text-ink-secondary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-ink">
          {year}年{month}月
        </h2>
        <button
          type="button"
          aria-label="次の月"
          onClick={() => setYearMonth((ym) => shiftMonth(ym.year, ym.month, 1))}
          className="flex h-9 w-9 items-center justify-center text-ink-secondary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 justify-items-center gap-y-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-xs font-semibold text-ink-secondary">
            {w}
          </span>
        ))}
        {monthGrid(year, month)
          .flat()
          .map((day, i) => {
            if (day === null) return <span key={i} className="h-9 w-9" />;
            const dateKey = buildDateKey(year, month, day);
            const recorded = recordedDates.has(dateKey);
            const isToday = dateKey === todayKey;
            const cellClass = `flex h-9 w-9 items-center justify-center rounded-full text-sm ${
              recorded
                ? "bg-accent font-medium text-white"
                : isToday
                  ? "border border-accent text-accent"
                  : "text-ink-secondary"
            }`;
            // 記録がある日はタップでその日の記録を開ける
            if (recorded && onSelectDate) {
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`${month}月${day}日の記録を見る`}
                  onClick={() => onSelectDate(dateKey)}
                  className={cellClass}
                >
                  {day}
                </button>
              );
            }
            return (
              <span key={i} className={cellClass}>
                {day}
              </span>
            );
          })}
      </div>
    </section>
  );
}
