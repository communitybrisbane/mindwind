import type { SVGProps } from "react";

/** 旧 UI のアイコンの残り（エラー・404・LoadingScreen が使う SpiralIcon だけ）。新 UI は components/ui/Icon を使う */

/** ブランドのスパイラル（風）。塗りなし・丸端。タブ/ロゴ共通 */
export function SpiralIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="186 362 652 341" fill="none" aria-hidden {...props}>
      <path
        d="M 302 572 a 55 55 0 0 1 110 0 a 95 95 0 0 1 -190 0 C 222 390 442 360 602 440 C 682 480 742 512 802 512"
        stroke="currentColor"
        strokeWidth={50}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
