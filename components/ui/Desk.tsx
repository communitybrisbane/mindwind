"use client";

// 革の机（契約 §7 タスク41）。画面のいちばん外側に置くと、ランプ・ムラ・革のしぼ・粒が全部入る。
// 実体は app/globals.css の .desk（縫い目は .stitch の別要素）。

import type { CSSProperties, ReactNode } from "react";

export type DeskProps = {
  className?: string;
  style?: CSSProperties;
  /** 縁の縫い目（点線）。既定 true */
  stitch?: boolean;
  children?: ReactNode;
};

export function Desk({ className, style, stitch = true, children }: DeskProps) {
  const cls = ["desk", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={cls} style={style}>
      {stitch && <div className="stitch" aria-hidden="true" />}
      {children}
    </div>
  );
}

export default Desk;
