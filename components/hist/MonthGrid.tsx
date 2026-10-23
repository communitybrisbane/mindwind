"use client";

// 風の記録：月のカレンダー（PLAN 74・プロトタイプ ui-v5 の .mgrid）。
// 月曜はじまりの7列。日ごとの玉（36px）・書かなかった日は点線の輪・左上に小さく日付。今日は緑の輪。
// 「記録あり」は記録 ∪ 気分。気分が無く記録だけある日は、点線の輪の中に小さな点を置く。
// 日付をタップ → onSelect（未来の日は押せない）。

import { useMemo } from "react";
import Bead from "@/components/ui/Bead";
import type { DayEntry } from "@/lib/db/types";
import { monthMatrix } from "@/lib/logic/moodDay";
import { MOODS } from "@/lib/logic/moods";
import styles from "./hist.module.css";

export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/* ---------- 月・年の表示の状態（HistorySheet が使う純粋な関数。テストあり） ---------- */

export type HistView = { mode: "month" | "year"; year: number; month: number };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 今日の日付キーから、開いたときの表示（今日の月） */
export function initialView(today: string): HistView {
  return { mode: "month", year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** 表示中の範囲（GET /api/moods の from/to）。全部が未来なら null（取りに行かない）。to は今日に丸める */
export function viewRange(v: HistView, today: string): { from: string; to: string } | null {
  const from = v.mode === "month" ? `${v.year}-${pad2(v.month)}-01` : `${v.year}-01-01`;
  const last = v.mode === "month" ? new Date(Date.UTC(v.year, v.month, 0)).getUTCDate() : 31;
  const lastKey = v.mode === "month" ? `${v.year}-${pad2(v.month)}-${pad2(last)}` : `${v.year}-12-31`;
  if (from > today) return null;
  return { from, to: lastKey > today ? today : lastKey };
}

/** 前へ（-1）・次へ（+1）。月は年をまたぐ */
export function shiftView(v: HistView, dir: -1 | 1): HistView {
  if (v.mode === "year") return { ...v, year: v.year + dir };
  let m = v.month + dir;
  let y = v.year;
  if (m < 1) {
    m = 12;
    y--;
  } else if (m > 12) {
    m = 1;
    y++;
  }
  return { ...v, year: y, month: m };
}

/** 次へ進めるか（今日の月・今日の年より先へは行かない） */
export function canGoNext(v: HistView, today: string): boolean {
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7));
  if (v.mode === "year") return v.year < ty;
  return v.year < ty || (v.year === ty && v.month < tm);
}

/** 見出し（「2026年10月」／「2026年」） */
export function viewTitle(v: HistView): string {
  return v.mode === "month" ? `${v.year}年${v.month}月` : `${v.year}年`;
}

type Props = {
  year: number;
  /** 1〜12 */
  month: number;
  /** 日付キー → その日の記録。未取得は null */
  days: Map<string, DayEntry> | null;
  /** 今日の日付キー（Asia/Tokyo） */
  today: string;
  onSelect: (date: string) => void;
};

export default function MonthGrid({ year, month, days, today, onSelect }: Props) {
  const cells = useMemo(() => monthMatrix(year, month).flat(), [year, month]);

  return (
    <div className={styles.mgrid} role="grid" aria-label={`${year}年${month}月`}>
      {WEEKDAYS.map((w) => (
        <div key={w} className={styles.wd} aria-hidden="true">
          {w}
        </div>
      ))}
      {cells.map((date, i) => {
        if (!date) return <div key={`e${i}`} className={styles.cell} aria-hidden="true" />;
        const d = Number(date.slice(8, 10));
        const entry = days?.get(date);
        const mood = entry?.mood ?? null;
        const records = entry?.records ?? 0;
        const isToday = date === today;
        const isFuture = date > today;
        const label =
          `${month}月${d}日` +
          (isToday ? "（今日）" : "") +
          (mood != null ? `・${MOODS[mood].name}` : "") +
          (records > 0 ? `・記録${records}件` : "");
        return (
          <button
            key={date}
            type="button"
            className={[styles.cell, styles.day, isToday ? styles.today : ""].filter(Boolean).join(" ")}
            onClick={() => onSelect(date)}
            disabled={isFuture}
            aria-label={label}
          >
            <span className={styles.num} aria-hidden="true">
              {d}
            </span>
            {mood != null ? (
              <span className={styles.beadWrap}>
                <Bead mood={mood} size={36} className={styles.bead} />
              </span>
            ) : (
              <span className={styles.empty} aria-hidden="true">
                {records > 0 && <span className={styles.recDot} />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
