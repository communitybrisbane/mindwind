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

/** 記録として保存：鉛筆 */
export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

/** 音声入力：マイク */
export function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

/** AI に渡すアクション：スパークル */
export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 3.5c.3 2.6 1 4.4 2.1 5.5 1.1 1.1 2.9 1.8 5.4 2.1.4 0 .4.7 0 .8-2.5.3-4.3 1-5.4 2.1-1.1 1.1-1.8 2.9-2.1 5.4-.1.4-.7.4-.8 0-.3-2.5-1-4.3-2.1-5.4-1.1-1.1-2.9-1.8-5.4-2.1-.4-.1-.4-.7 0-.8 2.5-.3 4.3-1 5.4-2.1 1.1-1.1 1.8-2.9 2.1-5.5 0-.4.7-.4.8 0Z" />
      <path d="M19 2.8c.15 1.1.45 1.85.9 2.3.45.45 1.2.75 2.3.9.25 0 .25.45 0 .5-1.1.15-1.85.45-2.3.9-.45.45-.75 1.2-.9 2.3-.05.25-.45.25-.5 0-.15-1.1-.45-1.85-.9-2.3-.45-.45-1.2-.75-2.3-.9-.25-.05-.25-.45 0-.5 1.1-.15 1.85-.45 2.3-.9.45-.45.75-1.2.9-2.3.05-.25.45-.25.5 0Z" />
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
