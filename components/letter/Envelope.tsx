"use client";

// 封筒（プロトタイプ #env）。クラフト紙のポケット・水玉の裏地・マスキングテープの〆。
// テープ（か封筒・下の丸いボタン）をタップ → フタが上向きに開く → 手紙が少し顔を出す →
// 親指で上へ引っぱり出す（usePullOut：離すと戻る・一定以上でそのまま出る・タップでも出る）。

import type { ReactNode, Ref } from "react";
import Icon from "@/components/ui/Icon";
import { sound, vibrate } from "@/lib/ui/feedback";
import { pullTranslate, usePullOut } from "@/lib/ui/usePullOut";
import styles from "./letter.module.css";

export type EnvelopePhase = "closed" | "flap" | "peek" | "ready" | "pulling" | "unfold" | "done";

export type EnvelopeProps = {
  phase: EnvelopePhase;
  /** 封をはがせるか（手紙が届いているか） */
  canOpen: boolean;
  /** 左下の鉛筆書き（「10/25 日曜」） */
  note: string;
  /** 封筒の下に出す一言（届いていない・書いている など） */
  status?: string;
  /** 封筒の中の手紙（1枚目の縮小） */
  preview?: ReactNode;
  /** 手紙が便箋に引き継がれて、封筒の中から消えた */
  taken: boolean;
  onPeel: () => void;
  onPullOut: () => void;
  ltrRef?: Ref<HTMLDivElement>;
};

export default function Envelope({
  phase,
  canOpen,
  note,
  status,
  preview,
  taken,
  onPeel,
  onPullOut,
  ltrRef,
}: EnvelopeProps) {
  const ready = phase === "ready";
  const { offset, dragging, handlers } = usePullOut({
    enabled: ready,
    onOut: onPullOut,
    onTick: () => {
      vibrate(5);
      sound("rub");
    },
  });

  const open = phase !== "closed";
  const gone = phase === "pulling" || phase === "unfold" || phase === "done";
  // フタが開いて少し待ってから手紙が顔を出す（peek）→ 引っぱれる（ready）
  const peek = phase === "peek" || phase === "ready" || phase === "pulling";
  const ty = peek ? pullTranslate(ready ? offset : 0) : 0;

  const peel = () => {
    if (phase === "closed" && canOpen) onPeel();
  };

  return (
    <div className={styles.envPos}>
      <div
        className={[styles.env, open ? styles.open : "", gone ? styles.gone : ""].filter(Boolean).join(" ")}
        role={phase === "closed" ? "button" : undefined}
        tabIndex={phase === "closed" && canOpen ? 0 : -1}
        aria-label="手紙を開ける"
        aria-disabled={!canOpen}
        onClick={peel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            peel();
          }
        }}
      >
        <div className={styles.lining} />
        <div className={styles.slot}>
          <div
            ref={ltrRef}
            className={[styles.ltr, dragging ? styles.dragging : "", taken ? styles.taken : ""].filter(Boolean).join(" ")}
            style={{ transform: `translateY(${ty}px)` }}
          >
            <div className={`${styles.ltrIn} ${styles.body}`} aria-hidden="true">
              {preview}
            </div>
          </div>
        </div>
        <div className={styles.pocket} />
        <svg className={styles.shade} viewBox="0 0 280 200" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="0,0 140,112 0,200" fill="#fff" opacity=".07" />
          <polygon points="280,0 140,112 280,200" fill="#000" opacity=".07" />
          <polygon points="0,200 140,112 280,200" fill="#000" opacity=".12" />
          <g filter="url(#pencil)" fill="none" stroke="#6b5430" strokeWidth="1.6" strokeLinecap="round" opacity=".6">
            <path d="M1 199C40 172 100 134 140 112" />
            <path d="M279 199C240 172 180 134 140 112" />
          </g>
        </svg>
        <div className={styles.flap}>
          <div className={styles.ff} />
          <div className={styles.fb} />
        </div>
        <svg className={styles.edge} viewBox="0 0 280 112" preserveAspectRatio="none" aria-hidden="true">
          <g filter="url(#pencil)" fill="none" stroke="#6b5430" strokeWidth="1.7" strokeLinecap="round" opacity=".65">
            <path d="M2 2C52 36 104 84 140 111" />
            <path d="M278 2C228 36 176 84 140 111" />
          </g>
        </svg>
        <button
          type="button"
          className={styles.tape}
          aria-label="封をはがす"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            peel();
          }}
        >
          〆
        </button>
        <span className={styles.note}>{note}</span>
        <svg className={styles.doodle} viewBox="0 0 44 26" aria-hidden="true">
          <path d="M3 15C10 15 13 6 22 9C28 11 26 18 21 16" />
          <path d="M5 22C16 21 30 23 41 19" />
        </svg>
        <div
          className={`${styles.pullHit} ${ready ? styles.on : ""}`}
          role="button"
          aria-label="手紙を引っぱり出す"
          tabIndex={ready ? 0 : -1}
          onKeyDown={(e) => {
            if (ready && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onPullOut();
            }
          }}
          {...handlers}
        />
      </div>
      <div className={`${styles.pullHint} ${ready && !dragging ? styles.on : ""}`} aria-hidden="true">
        <Icon name="arrow" />
      </div>
      {status && phase === "closed" && (
        <p className={styles.status} role="status">
          {status}
        </p>
      )}
    </div>
  );
}
