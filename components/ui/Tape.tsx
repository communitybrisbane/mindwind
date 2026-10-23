"use client";

import type { CSSProperties } from "react";
import styles from "./Paper.module.css";

export type TapeColor = "green" | "pink" | "paper";

export type TapeProps = {
  color?: TapeColor;
  className?: string;
  style?: CSSProperties;
};

const COLOR_CLASS: Record<TapeColor, string> = {
  green: styles.tapeGreen,
  pink: styles.tapePink,
  paper: styles.tapePaper,
};

/** マスキングテープ単体（飾り。読み上げない） */
export function Tape({ color = "green", className, style }: TapeProps) {
  const cls = [styles.tape, COLOR_CLASS[color], className ?? ""].filter(Boolean).join(" ");
  return <span aria-hidden="true" className={cls} style={style} />;
}

export default Tape;
