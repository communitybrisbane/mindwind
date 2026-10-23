"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// ステータスバー領域とシェル外側の色を画面に合わせる。
// 新 UI（v5）はすべて革の机（--color-felt）。紙の静的ページ（規約・プライバシー・開発用）だけ生成り。
const FELT = "#34492f";
const WARM = "#f2f0eb";
const PAPER_ROUTES = ["/terms", "/privacy", "/dev-login"];

const colorFor = (pathname: string) =>
  PAPER_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ? WARM : FELT;

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
