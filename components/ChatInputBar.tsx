"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  placeholder: string;
  onSend: (text: string) => void;
  disabled?: boolean;
  /** 右下のアクションボタンの中身（✨ など） */
  actionIcon: ReactNode;
  actionAriaLabel: string;
  /** 左下スロット（マイクボタン。なければ左パディングだけ確保） */
  leftSlot?: ReactNode;
  /** 記録画面はセリフ体（日記帳の質感） */
  serif?: boolean;
};

const SINGLE_LINE_HEIGHT = 48;

/**
 * 下部固定の共通入力バー（記録・相談・深掘り回答で共用）。
 * 1行のときは文字が左右アイコンの間（パディング48px）、
 * 複数行になったら本文は全幅・下段にアイコン行を確保する（DESIGN §Recording Page）。
 */
export default function ChatInputBar({
  placeholder,
  onSend,
  disabled,
  actionIcon,
  actionAriaLabel,
  leftSlot,
  serif,
}: Props) {
  const [text, setText] = useState("");
  const [grown, setGrown] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // 高さは描画後に実測して決める（grown 切替でパディングと幅が変わり行数も変わるため、
  // grown を依存に含めて切替後にもう一度計測し直す）
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const cs = getComputedStyle(el);
    const contentHeight =
      el.scrollHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const isGrown = contentHeight > 30; // 1行 = 24px
    setGrown(isGrown);
    el.style.height = isGrown
      ? `${Math.min(contentHeight + 12 + 52, 220)}px`
      : `${SINGLE_LINE_HEIGHT}px`;
  }, [text, grown]);

  function send() {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className={`block w-full resize-none overflow-hidden rounded-3xl border border-input-border bg-white text-base leading-6 text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none disabled:bg-ceramic ${
          serif ? "font-serif" : ""
        } ${grown ? "px-3 pb-[52px] pt-3" : "h-12 px-12 py-3"}`}
      />
      <div className="absolute bottom-2 left-2">{leftSlot}</div>
      <button
        type="button"
        aria-label={actionAriaLabel}
        onClick={send}
        disabled={disabled}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white disabled:bg-ink-tertiary"
      >
        {actionIcon}
      </button>
    </div>
  );
}
