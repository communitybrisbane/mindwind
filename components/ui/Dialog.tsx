"use client";

// 紙のダイアログ（契約 §3 タスク42）。設定の確認・削除で使う。
// 暗い幕の上に少し傾いた紙。見出し＋本文＋丸いボタン（左に「やめる」、右に実行）。
// 見た目と動きはプロトタイプ ui-v5.html の dlg() / #dlg のとおり。
// 幕をタップ・Esc で閉じる（onClose）。ボタンは押すと閉じてから onPress。hold は長押し 1300ms。

import { useEffect, useId, type ReactNode } from "react";
import { Paper } from "@/components/ui/Paper";
import { RoundButton, type RoundButtonVariant } from "@/components/ui/RoundButton";
import type { IconName } from "@/components/ui/Icon";
import { sound, vibrate } from "@/lib/ui/feedback";
import styles from "./Dialog.module.css";

export const DIALOG_HOLD_MS = 1300;

export type DialogButton = {
  icon: IconName;
  label: string;
  /** 既定 "ink"（紙の上の点線） */
  variant?: RoundButtonVariant;
  /** 長押し（1300ms）で発火 */
  hold?: boolean;
  onPress: () => void;
};

export type DialogProps = {
  open: boolean;
  title: string;
  text: ReactNode;
  buttons: DialogButton[];
  onClose: () => void;
};

export function Dialog({ open, title, text, buttons, onClose }: DialogProps) {
  const titleId = useId();
  const textId = useId();

  // 開いたときの手ざわり（プロトタイプ：vib(8); snd.rub()）
  useEffect(() => {
    if (!open) return;
    vibrate(8);
    sound("rub");
  }, [open]);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cls = [styles.veil, open ? styles.show : ""].filter(Boolean).join(" ");

  return (
    <div className={cls} onClick={onClose} aria-hidden={!open} inert={!open}>
      <Paper role="dialog" aria-modal aria-label={title} className={styles.box}>
        {/* 紙の中のタップは幕に伝えない（閉じない） */}
        <div onClick={(e) => e.stopPropagation()}>
          <div id={titleId} className={styles.title}>
            {title}
          </div>
          <div id={textId} className={styles.text}>
            {text}
          </div>
          <div className={styles.buttons}>
            {buttons.map((b, i) => {
              const common = {
                icon: b.icon,
                label: b.label,
                variant: b.variant ?? ("ink" as RoundButtonVariant),
                size: 62,
                "aria-label": b.label,
              };
              return b.hold ? (
                <RoundButton
                  key={i}
                  {...common}
                  holdMs={DIALOG_HOLD_MS}
                  onHold={() => {
                    sound("seal");
                    onClose();
                    b.onPress();
                  }}
                />
              ) : (
                <RoundButton
                  key={i}
                  {...common}
                  onClick={() => {
                    sound("tick");
                    onClose();
                    b.onPress();
                  }}
                />
              );
            })}
          </div>
        </div>
      </Paper>
    </div>
  );
}

export default Dialog;
