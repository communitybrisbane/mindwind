"use client";

// 風の記録：年（PLAN 74・プロトタイプ ui-v5 の .ygrid / .ymo）。
// 12か月を3列に。各月は月曜はじまりの小さな点の格子（1日＝1つぶ）。
// 点は玉の色だけ（MOODS[i].color）。気分が無く記録だけの日は少し濃いグレー、書かなかった日は薄いグレー。
// 月をタップ → onPickMonth（その月の月表示へ）。

import { useMemo } from "react";
import type { DayEntry } from "@/lib/db/types";
import { monthMatrix } from "@/lib/logic/moodDay";
import { MOODS } from "@/lib/logic/moods";
import styles from "./hist.module.css";

type Props = {
  year: number;
  days: Map<string, DayEntry> | null;
  today: string;
  onPickMonth: (month: number) => void;
};

export default function YearGrid({ year, days, today, onPickMonth }: Props) {
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => monthMatrix(year, i + 1).flat()),
    [year]
  );

  return (
    <div className={styles.ygrid}>
      {months.map((cells, mi) => {
        let recorded = 0;
        const dots = cells.map((date, i) => {
          if (!date) return <i key={`e${i}`} className={styles.ydotBlank} />;
          const entry = days?.get(date);
          const mood = entry?.mood ?? null;
          const has = mood != null || (entry?.records ?? 0) > 0;
          if (has) recorded++;
          const cls = [
            styles.ydot,
            mood == null && has ? styles.ydotRec : "",
            date > today ? styles.ydotFuture : "",
          ]
            .filter(Boolean)
            .join(" ");
          return <i key={date} className={cls} style={mood != null ? { background: MOODS[mood].color } : undefined} />;
        });
        return (
          <button
            key={mi}
            type="button"
            className={styles.ymo}
            onClick={() => onPickMonth(mi + 1)}
            aria-label={`${mi + 1}月（記録${recorded}日）をひらく`}
          >
            <span className={styles.yl}>{mi + 1}月</span>
            <span className={styles.yd} aria-hidden="true">
              {dots}
            </span>
          </button>
        );
      })}
    </div>
  );
}
