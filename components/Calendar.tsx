"use client";

import { useState } from "react";
import { buildDateKey, monthGrid, parseYearMonth, shiftMonth } from "@/lib/logic/calendar";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  /** 記録がある日の日付キー（"YYYY-MM-DD"） */
  recordedDates: Set<string>;
  todayKey: string;
};

export default function Calendar({ recordedDates, todayKey }: Props) {
  const [{ year, month }, setYearMonth] = useState(() => parseYearMonth(todayKey));

  return (
    <section className="rounded-xl bg-white p-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
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
            return (
              <span
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                  recorded
                    ? "bg-accent font-medium text-white"
                    : isToday
                      ? "border border-accent text-accent"
                      : "text-ink-secondary"
                }`}
              >
                {day}
              </span>
            );
          })}
      </div>
    </section>
  );
}
