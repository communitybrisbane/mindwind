"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// ステータスバー領域の色を画面に合わせる（スタート画面=Green Accent、他=Neutral Warm）
const colorFor = (pathname: string) => (pathname === "/" ? "#00754a" : "#f2f0eb");

/** ルートに応じて theme-color メタタグを切り替える（描画はしない） */
export default function ThemeColor() {
  const pathname = usePathname();

  useEffect(() => {
    const color = colorFor(pathname);
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", color));
    // body の背景（スマホ幅でステータスバー裏に映る色）も同じ色に追従させる
    document.documentElement.style.setProperty("--page-edge", color);
  }, [pathname]);

  return null;
}
