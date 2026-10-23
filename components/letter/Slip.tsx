"use client";

// 手紙の引用：マスキングテープで貼った切れ端（プロトタイプ .slip）。
// 本人の言葉は refs[].quote をそのまま出す（書き換えない）。消した記録は「（消した記録）」と伏せる（契約 §8）。

import type { LetterRef } from "@/lib/db/types";
import { dayOfWeek } from "@/lib/logic/week";
import styles from "./letter.module.css";

const WEEKDAYS = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"] as const;

/** "2026-10-20" → "10/20 火曜の記録" */
export function slipDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  if (!m || !d) return "";
  return `${m}/${d} ${WEEKDAYS[dayOfWeek(dateKey)]}の記録`;
}

export default function Slip({ refItem, alt = false }: { refItem: LetterRef | undefined; alt?: boolean }) {
  const deleted = !refItem || refItem.deleted;
  return (
    <div className={`${styles.slip} ${alt ? styles.s2 : ""}`}>
      <i className={styles.tp} aria-hidden="true" />
      {refItem?.date && <span className={styles.sd}>{slipDateLabel(refItem.date)}</span>}
      {deleted ? (
        <span className={`${styles.sq} ${styles.deleted}`}>（消した記録）</span>
      ) : (
        <span className={styles.sq}>{refItem.quote}</span>
      )}
    </div>
  );
}
