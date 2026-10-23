"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { vibrate } from "@/lib/ui/feedback";
import styles from "./RoundButton.module.css";

export type RoundButtonVariant = "paper" | "green" | "chalk" | "ink" | "warn";

export type RoundButtonProps = {
  /** 既定 "paper"。chalk＝机の上の点線、ink＝紙の上の点線、warn＝赤 */
  variant?: RoundButtonVariant;
  icon: IconName;
  /** 下に小さく添える文字 */
  label?: string;
  /** px。既定 54・最小 54 */
  size?: number;
  "aria-label": string;
  onClick?: () => void;
  /** 長押し（進捗の輪が回り、holdMs で発火）。指定時は onClick は呼ばない */
  onHold?: () => void;
  /** 既定 700（削除は 1300） */
  holdMs?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const MIN_SIZE = 54;

/** 丸いアイコンボタン。押すと沈む。最小 54px */
export function RoundButton({
  variant = "paper",
  icon,
  label,
  size = MIN_SIZE,
  "aria-label": ariaLabel,
  onClick,
  onHold,
  holdMs = 700,
  disabled = false,
  className,
  style,
}: RoundButtonProps) {
  const px = Math.max(MIN_SIZE, size);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef(0);
  const holdingRef = useRef(false);
  const [holding, setHolding] = useState(false);

  const setProgress = (p: number) => {
    btnRef.current?.style.setProperty("--p", String(p));
  };

  const stopHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    btnRef.current?.style.setProperty("--p", "0");
    setHolding(false);
  }, []);

  const startHold = () => {
    if (!onHold || disabled || holdingRef.current) return;
    holdingRef.current = true;
    setHolding(true);
    vibrate(10);
    const t0 = performance.now();
    const step = (t: number) => {
      if (!holdingRef.current) return;
      const p = Math.min(1, (t - t0) / holdMs);
      setProgress(p * 100);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        holdingRef.current = false;
        setHolding(false);
        setProgress(0);
        vibrate([20, 40, 36]);
        onHold();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // 外れたら止める
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => {
    if (disabled) stopHold();
  }, [disabled, stopHold]);

  const handleClick = () => {
    if (disabled || onHold) return;
    vibrate(8);
    onClick?.();
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!onHold) return;
    e.preventDefault();
    startHold();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!onHold || e.repeat) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startHold();
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!onHold) return;
    if (e.key === "Enter" || e.key === " ") stopHold();
  };

  const cls = [
    styles.rb,
    variant !== "paper" ? styles[variant] : "",
    holding ? styles.pressed : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={btnRef}
      type="button"
      className={cls}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.44), ...style }}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      onPointerDown={onHold ? onPointerDown : undefined}
      onPointerUp={onHold ? stopHold : undefined}
      onPointerLeave={onHold ? stopHold : undefined}
      onPointerCancel={onHold ? stopHold : undefined}
      onKeyDown={onHold ? onKeyDown : undefined}
      onKeyUp={onHold ? onKeyUp : undefined}
      onContextMenu={onHold ? (e) => e.preventDefault() : undefined}
    >
      {onHold && <span className={styles.ring} aria-hidden="true" />}
      <span className={styles.icon} aria-hidden="true">
        <Icon name={icon} />
      </span>
      {label && (
        <span className={styles.cap} aria-hidden="true">
          {label}
        </span>
      )}
    </button>
  );
}

export default RoundButton;
