"use client";

// 独自の鉛筆アイコン（二重のラフスケッチ）。viewBox 0 0 32 32。
// プロトタイプ（docs/prototype/ui-v5.html）と同じく、同じ線を少しずらして薄く重ね（影の線）、
// その上に本線を描く。線のゆらぎは SvgDefs（41）の #pencil フィルター。
// 線の色は currentColor（親の color）。大きさは既定 1em（親の font-size に合わせる）。

import type { CSSProperties } from "react";
import { ICON_PATHS, type IconName } from "./iconPaths";

export { ICON_PATHS, ICON_NAMES, type IconName } from "./iconPaths";

type IconProps = {
  name: IconName;
  /** px（数値）か CSS の長さ。既定 "1em" */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** 線の太さ。既定 2.5（プロトタイプの svg.i[data-ic]） */
  strokeWidth?: number;
  /** 指定すると読み上げ対象になる（既定は飾りとして aria-hidden） */
  title?: string;
};

export default function Icon({ name, size = "1em", className, style, strokeWidth = 2.5, title }: IconProps) {
  const inner = ICON_PATHS[name];
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      style={{ overflow: "visible", flex: "none", filter: "url(#pencil)", ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* 中身はこのファイルの定数（プロトタイプの写し）だけ。利用者の入力は入らない */}
      <g transform="translate(.7 .55)" opacity=".28" dangerouslySetInnerHTML={{ __html: inner }} />
      <g dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}

export { Icon };
