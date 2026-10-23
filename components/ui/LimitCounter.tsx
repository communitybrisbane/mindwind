"use client";

import { warnAtFor } from "@/lib/logic/limits";

type Props = {
  length: number;
  max: number;
  /** この文字数以上で赤字。既定は上限の約9割（ceil(max*0.9)） */
  warnAt?: number;
  className?: string;
};

/** 「n / max」。warnAt 以上で赤字（プロトタイプの .cn と同じ：普段は見えず、近づくと出る） */
export default function LimitCounter({ length, max, warnAt, className }: Props) {
  const threshold = warnAt ?? warnAtFor(max);
  const on = length >= threshold;
  return (
    <span
      aria-live="off"
      className={className}
      style={{
        fontFamily: "var(--font-hand2)",
        fontSize: 11.5,
        color: "#a8321e",
        opacity: on ? 1 : 0,
        transition: "opacity .2s",
        pointerEvents: "none",
      }}
    >
      {length} / {max}
    </span>
  );
}

export { LimitCounter };
