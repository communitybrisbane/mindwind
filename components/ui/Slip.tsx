"use client";

import type { ReactNode } from "react";
import styles from "./Paper.module.css";
import { Tape } from "./Tape";

export type SlipProps = {
  tone?: "yellow" | "cream";
  tape?: "left" | "right" | "center" | "none";
  tapeColor?: "green" | "pink";
  /** 傾き（deg）。既定 -1.3 */
  rotate?: number;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
};

const TAPE_POS = {
  left: styles.tapeLeft,
  right: styles.tapeRight,
  center: styles.tapeCenter,
} as const;

/** 付箋（マスキングテープつき） */
export function Slip({
  tone = "yellow",
  tape = "left",
  tapeColor = "green",
  rotate = -1.3,
  className,
  onClick,
  children,
}: SlipProps) {
  const cls = [
    styles.slip,
    tone === "cream" ? styles.cream : "",
    onClick ? styles.clickable : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} style={{ transform: `rotate(${rotate}deg)` }} onClick={onClick}>
      {tape !== "none" && <Tape color={tapeColor} className={TAPE_POS[tape]} />}
      {children}
    </div>
  );
}

export default Slip;
