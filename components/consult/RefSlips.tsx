"use client";

import type { RefPage } from "@/app/(tabs)/search/useConsultChat";
import styles from "./consult.module.css";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "2026-10-23" → { m: 10, d: 23, w: "金" }（不正な形式は null） */
function parseDateKey(dateKey: string): { m: number; d: number; w: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const w = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { m, d, w };
}

/** 付箋の小片の日付「10/23 金」 */
export function refShortDate(dateKey: string): string {
  const p = parseDateKey(dateKey);
  return p ? `${p.m}/${p.d} ${p.w}` : dateKey;
}

/** モーダルの見出し「10月23日（金）の記録」 */
export function refLongDate(dateKey: string): string {
  const p = parseDateKey(dateKey);
  return p ? `${p.m}月${p.d}日（${p.w}）の記録` : `${dateKey}の記録`;
}

/** 消した記録の切れ端に出す文言（手紙の Slip と同じ） */
export const DELETED_REF_TEXT = "（消した記録）";

/** 表示する本文。新形式は quote（チャンクの本文そのまま）、旧形式は保存されていた項目をつなぐ。消した記録は伏せる */
export function refBody(ref: RefPage): string {
  if (ref.deleted) return DELETED_REF_TEXT;
  if (ref.quote) return ref.quote;
  const legacy = [ref.event, ref.thinking, ref.action, ref.reason, ref.emotion, ref.values]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join("\n");
  return legacy || ref.title || "";
}

type Props = {
  refs: RefPage[];
  onSelect: (ref: RefPage) => void;
};

/** 返事の下の「読み返したページ」＝過去の記録の付箋の小片（タップで全文） */
export default function RefSlips({ refs, onSelect }: Props) {
  if (refs.length === 0) return null;
  return (
    <div className={styles.refs}>
      <div className={styles.refsLabel}>読み返したページ</div>
      <div className={styles.refsRow}>
        {refs.map((ref, i) => (
          <button
            key={`${ref.id}-${i}`}
            type="button"
            className={styles.rslip}
            aria-label={`${refLongDate(ref.date)}を読む`}
            onClick={() => onSelect(ref)}
          >
            <b className={styles.rslipDate}>{refShortDate(ref.date)}</b>
            <span className={styles.rslipText}>{refBody(ref)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
