"use client";

// 気分の玉（5段階）。水彩の紙の玉（#wc）の上に、鉛筆（#pencil）で風の絵を描く。
// 色・名前は lib/logic/moods.ts、風の絵は ./iconPaths.ts（プロトタイプ g1〜g5 の写し）。
// フィルター #wc / #pencil は SvgDefs（41）が layout に1回だけ置く。

import type { CSSProperties } from "react";
import { moodDef, type MoodId } from "@/lib/logic/moods";
import { MOOD_GLYPHS, MOOD_GLYPH_STROKE_WIDTH, MOOD_GLYPH_VIEWBOX } from "./iconPaths";
import styles from "./Bead.module.css";

const GLYPH_INK = "#33312c";

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

function GlyphPaths({ mood }: { mood: MoodId }) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={MOOD_GLYPH_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {MOOD_GLYPHS[mood].map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

type BeadProps = {
  mood: MoodId;
  /** px。既定 38 */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/** 気分の玉（水彩の玉＋鉛筆の風）。読み上げでは玉の名前（「追い風」など）を読む */
export default function Bead({ mood, size = 38, className, style }: BeadProps) {
  const m = moodDef(mood);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cx(styles.bead, className)}
      style={style}
      role="img"
      aria-label={m.name}
      data-mood={m.key}
    >
      <g filter="url(#wc)">
        <circle cx="50" cy="50" r="42" fill={m.color} opacity=".86" />
        <circle cx="50" cy="50" r="41" fill="none" stroke={m.deep} strokeWidth="4" opacity=".6" />
      </g>
      <g filter="url(#pencil)" style={{ color: GLYPH_INK }}>
        <svg x="22" y="22" width="56" height="56" viewBox={MOOD_GLYPH_VIEWBOX} overflow="visible">
          <GlyphPaths mood={mood} />
        </svg>
      </g>
    </svg>
  );
}

export { Bead };

type MoodGlyphProps = {
  mood: MoodId;
  /** px。既定 24 */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/** 風の線だけ（封蝋の中・リールの横）。色は currentColor */
export function MoodGlyph({ mood, size = 24, className, style }: MoodGlyphProps) {
  return (
    <svg
      viewBox={MOOD_GLYPH_VIEWBOX}
      width={size}
      height={size}
      className={cx(styles.glyph, className)}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <GlyphPaths mood={mood} />
    </svg>
  );
}

type BeadSlotProps = {
  /** 今日（まだ書いていない）。緑の輪＋呼吸 */
  today?: boolean;
  /** px。既定 38 */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/** 空の点線の輪（書かなかった日） */
export function BeadSlot({ today = false, size = 38, className, style }: BeadSlotProps) {
  return (
    <span
      className={cx(styles.slot, today && styles.today, className)}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    />
  );
}
