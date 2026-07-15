import type { SVGProps } from "react";

/** 線画アイコンの共通ベース（stroke 系） */
function LineIcon({
  children,
  strokeWidth = 1.8,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** 削除：ゴミ箱 */
export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </LineIcon>
  );
}

/** 閉じる：✕ */
export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon strokeWidth={2} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </LineIcon>
  );
}

/** 完了・保存済み：チェック */
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon strokeWidth={2.5} {...props}>
      <path d="M4 12l6 6L20 6" />
    </LineIcon>
  );
}

/** アコーディオン開閉：下向きシェブロン（開いたら rotate-180） */
export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon strokeWidth={2} {...props}>
      <path d="M6 9l6 6 6-6" />
    </LineIcon>
  );
}

/** 月送り：左シェブロン */
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon strokeWidth={2} {...props}>
      <path d="M15 18l-6-6 6-6" />
    </LineIcon>
  );
}

/** 月送り：右シェブロン */
export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon strokeWidth={2} {...props}>
      <path d="M9 6l6 6-6 6" />
    </LineIcon>
  );
}

/** 相談履歴：時計 */
export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </LineIcon>
  );
}

/** 新しい相談：＋ */
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </LineIcon>
  );
}

/** プロフィール編集：歯車 */
export function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </LineIcon>
  );
}

/** ストリーク：炎（塗り） */
export function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2c.7 3 .3 5-1.4 6.9C9.3 10.3 8 11.9 8 14a4 4 0 0 0 8 0c0-.8-.2-1.6-.6-2.3-.6 1-1.6 1.5-1.6 1.5.5-2.4-.2-5-1.8-7.1C11.5 5 11.7 3.4 12 2Zm-4.6 6C6 9.7 5 11.7 5 14a7 7 0 1 0 14 0c0-2-.8-3.9-2-5.3.1.9 0 1.8-.4 2.6C15.7 9 14 6.5 14.4 3.2 13 4.6 12.6 6.6 13 8.5c-1-1.2-1.6-2.7-1.6-4.3-2.5 1.4-4 3.4-4 3.8Z" />
    </svg>
  );
}

/** 参考にした記録：ペーパークリップ */
export function PaperclipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="m21 11.5-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 0 1 5.7 5.7l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8" />
    </LineIcon>
  );
}

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

/** ホームタブ：家（一体型アウトライン＋アーチドア） */
export function HouseIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3 10.2 12 3l9 7.2V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9.3 22v-4.5a2.7 2.7 0 0 1 5.4 0V22" />
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

/** 相談の送信：紙飛行機 */
export function SendIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M21 3 10.5 13.5M21 3l-7 19-3.5-8.5L2 10Z" />
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
