"use client";

// インクの輪の消印（回転盤で決めたとき）と、一言の封蝋（長押しで保存したとき）。
// 消印の文字はプロトタイプどおり「MINDWIND ・ 2026.10.25 ・ SUN ・ …」。フィルター #ink / #pencil は SvgDefs（41）。

import { useId } from "react";
import { MoodGlyph } from "@/components/ui/Bead";
import type { MoodId } from "@/lib/logic/moods";
import styles from "./mood.module.css";

const WEEK_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const WEEK_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

function parseKey(dateKey: string): { y: number; m: number; d: number; w: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return { y, m: mo, d, w: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
}

/** 「10月25日 日曜日」（見出しの日付） */
export function moodDateLabel(dateKey: string): string {
  const p = parseKey(dateKey);
  if (!p) return "";
  return `${p.m}月${p.d}日 ${WEEK_JA[p.w]}曜日`;
}

/** 「MINDWIND ・ 2026.10.25 ・ SUN ・ 」を2周（消印の輪の文字） */
export function postmarkText(dateKey: string): string {
  const p = parseKey(dateKey);
  const unit = p
    ? `MINDWIND ・ ${p.y}.${String(p.m).padStart(2, "0")}.${String(p.d).padStart(2, "0")} ・ ${WEEK_EN[p.w]} ・ `
    : "MINDWIND ・ ";
  return unit + unit;
}

function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

type PostmarkProps = {
  dateKey: string;
  /** 押した（輪が描かれる） */
  go: boolean;
  /** 輪の色（凪だけ薄いクリーム） */
  color: string;
};

/** インクの輪の消印 */
export default function Postmark({ dateKey, go, color }: PostmarkProps) {
  const ringId = `pm-ring-${safeId(useId())}`;
  return (
    <svg
      className={`${styles.ink} ${go ? styles.go : ""}`}
      viewBox="0 0 280 280"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={ringId} d="M140 140 m-108 0 a108 108 0 1 1 216 0 a108 108 0 1 1 -216 0" />
      </defs>
      <g filter="url(#ink)" style={{ color }}>
        <circle className={styles.draw} cx="140" cy="140" r="130" fill="none" stroke="currentColor" strokeWidth="3.2" />
        <circle cx="140" cy="140" r="121" fill="none" stroke="currentColor" strokeWidth="1" />
        <g className={styles.ringrot}>
          <text fontSize="13" fontWeight="700" fill="currentColor" fontFamily="var(--font-mincho), sans-serif">
            <textPath href={`#${ringId}`} textLength="670" lengthAdjust="spacing">
              {postmarkText(dateKey)}
            </textPath>
          </text>
        </g>
      </g>
    </svg>
  );
}

export { Postmark };

type WaxSealProps = {
  mood: MoodId | null;
  playing: boolean;
  onAnimationEnd?: () => void;
};

/** 赤い封蝋（中に今日の玉の風の絵）。playing で押される */
export function WaxSeal({ mood, playing, onAnimationEnd }: WaxSealProps) {
  const gid = `seal-g-${safeId(useId())}`;
  return (
    <div
      className={`${styles.seal} ${playing ? styles.go : ""}`}
      aria-hidden="true"
      onAnimationEnd={onAnimationEnd}
    >
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id={gid} cx=".36" cy=".3" r=".9">
            <stop offset="0" stopColor="#d9604a" />
            <stop offset="1" stopColor="#9c2a1b" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#${gid})`} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" />
      </svg>
      {mood !== null && (
        <span className={styles.sealGlyph}>
          <MoodGlyph mood={mood} size={60} style={{ width: "100%", height: "100%" }} />
        </span>
      )}
    </div>
  );
}
