"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import MicButton from "./MicButton";

type Props = {
  placeholder: string;
  onSend: (text: string) => void;
  disabled?: boolean;
  /** 右下のアクションボタンの中身（✨ など） */
  actionIcon: ReactNode;
  actionAriaLabel: string;
  /** 左下にマイクボタンを表示（非対応ブラウザでは自動で消える） */
  mic?: boolean;
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
  mic,
  serif,
}: Props) {
  const [text, setText] = useState("");
  // 音声認識の途中経過（確定前）。表示上はテキスト末尾に足して見せる
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [grown, setGrown] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const displayText = interim ? text + interim : text;

  // 高さは描画後に実測して決める。1行↔複数行の判定は常に「1行モードのパディング」を
  // 一時適用して測る（表示中のレイアウトに依存させると境目の文字数で判定が反転し続け、
  // 無限ループになるため。判定条件を固定して同じ入力なら必ず同じ結果にする）
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const style = el.style;
    style.height = "0px";
    style.padding = "12px 48px";
    const isGrown = el.scrollHeight - 24 > 30 || displayText.includes("\n");
    if (isGrown) {
      style.padding = "12px";
      const contentHeight = el.scrollHeight - 24;
      style.padding = "";
      // 文章量に応じて伸ばす（スクロールさせない）。画面の6割を超えたときだけ安全のため内部スクロール
      const fullHeight = contentHeight + 12 + 52;
      const maxHeight = Math.floor(window.innerHeight * 0.6);
      style.height = `${Math.min(fullHeight, maxHeight)}px`;
      style.overflowY = fullHeight > maxHeight ? "auto" : "hidden";
    } else {
      style.padding = "";
      style.height = `${SINGLE_LINE_HEIGHT}px`;
      style.overflowY = "hidden";
    }
    setGrown(isGrown);
  }, [displayText]);

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
        value={displayText}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className={`block w-full resize-none overflow-hidden rounded-3xl border border-input-border bg-white text-base leading-6 text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none disabled:bg-ceramic ${
          serif ? "font-serif" : ""
        } ${grown ? "px-3 pb-[52px] pt-3" : "h-12 px-12 py-3"}`}
      />
      {mic && (
        <div className="absolute bottom-2 left-2">
          <MicButton
            disabled={disabled}
            onFinal={(t) => setText((prev) => prev + t)}
            onInterim={setInterim}
            onRecordingChange={setRecording}
          />
        </div>
      )}
      <button
        type="button"
        aria-label={actionAriaLabel}
        onClick={send}
        disabled={disabled}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white disabled:bg-ink-tertiary"
      >
        {actionIcon}
      </button>
      {recording && (
        <p className="pt-1.5 text-[13px] text-ink-secondary">
          音声はブラウザの音声認識サービスに送信されます
        </p>
      )}
    </div>
  );
}
