"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import type { RefPage } from "@/app/(tabs)/search/useConsultChat";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import { sound } from "@/lib/ui/feedback";
import { refBody, refLongDate } from "./RefSlips";
import styles from "./consult.module.css";

type Props = {
  page: RefPage | null;
  onClose: () => void;
};

/** 読み返したページの全文（紙のモーダル）。幕のタップ・Esc・下の丸ボタンで閉じる */
export default function RefModal({ page, onClose }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!page) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, onClose]);

  if (!page) return null;

  const close = () => {
    sound("tick");
    onClose();
  };

  // タブバーより上に重ねるため body 直下に出す
  return createPortal(
    <div
      className={styles.modal}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.modalInner}>
        <Paper className={styles.refSheet}>
          <div className={styles.refDate} id={titleId}>
            {refLongDate(page.date)}
          </div>
          <div className={styles.refText}>{refBody(page)}</div>
        </Paper>
        <RoundButton
          icon="check"
          size={64}
          aria-label="とじる"
          className={styles.modalClose}
          onClick={close}
        />
      </div>
    </div>,
    document.body,
  );
}
