import type { SVGProps } from "react";

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

/** 記録タブ：積み上がるブロック */
export function BlocksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3.5" y="15" width="5.4" height="5.4" rx="1" />
      <rect x="9.3" y="15" width="5.4" height="5.4" rx="1" />
      <rect x="9.3" y="9.4" width="5.4" height="5.4" rx="1" />
      <rect x="15.1" y="15" width="5.4" height="5.4" rx="1" />
      <rect x="15.1" y="9.4" width="5.4" height="5.4" rx="1" />
      <rect x="15.1" y="3.8" width="5.4" height="5.4" rx="1" />
    </svg>
  );
}

/** 相談タブ：吹き出し */
export function ChatBubbleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <circle cx="8" cy="12" r="0.4" fill="currentColor" />
      <circle cx="12" cy="12" r="0.4" fill="currentColor" />
      <circle cx="16" cy="12" r="0.4" fill="currentColor" />
    </svg>
  );
}
