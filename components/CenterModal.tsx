"use client";

import type { ReactNode } from "react";
import { CloseIcon } from "./icons";

type Props = {
  ariaLabel: string;
  onClose: () => void;
  /** ✕ボタンの左に出すヘッダー内容（タイトルなど） */
  header: ReactNode;
  children: ReactNode;
};

/** 中央モーダル（dim 背景・✕/背景タップで閉じる・長い内容はカード内スクロール） */
export default function CenterModal({ ariaLabel, onClose, header, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-[398px] overflow-y-auto rounded-2xl bg-white p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">{header}</div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center text-ink-secondary"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
