"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./Paper.module.css";

export type PaperProps = {
  as?: "div" | "section" | "article";
  /** 傾き（deg） */
  rotate?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  role?: string;
  "aria-label"?: string;
  /** role="dialog" のときに true（背景を読み上げ対象から外す） */
  "aria-modal"?: boolean;
  children?: ReactNode;
};

/** 紙。背景の質感＋ふちのゆらぎ＋影。中の文字色は鉛筆（--color-graphite） */
export function Paper({
  as: Tag = "div",
  rotate,
  className,
  style,
  onClick,
  role,
  "aria-label": ariaLabel,
  "aria-modal": ariaModal,
  children,
}: PaperProps) {
  const cls = ["sheet", styles.paper, onClick ? styles.clickable : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  const merged: CSSProperties | undefined =
    rotate != null
      ? { transform: `rotate(${rotate}deg)`, ...style }
      : style;
  return (
    <Tag className={cls} style={merged} onClick={onClick} role={role} aria-label={ariaLabel} aria-modal={ariaModal || undefined}>
      {children}
    </Tag>
  );
}

export default Paper;
