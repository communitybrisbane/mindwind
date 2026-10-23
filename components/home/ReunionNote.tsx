"use client";

// 今日の1枚：黄色い付箋をめくると、過去の自分の言葉（本人の文章をそのまま）が出る。1日1回。
// 選び方は lib/logic/reunion.ts（AI は使わない）。めくったあとに「このことを相談する」。

import type { KeyboardEvent } from "react";
import Icon from "@/components/ui/Icon";
import { RoundButton } from "@/components/ui/RoundButton";
import type { ThoughtSummary } from "@/lib/db/types";
import type { ReunionLabel } from "@/lib/logic/reunion";
import styles from "./home.module.css";

export type ReunionPick = { thought: ThoughtSummary; label: ReunionLabel };

type Props = {
  /** null＝まだ届かない（記録が少ない）。undefined＝読み込み中 */
  pick: ReunionPick | null | undefined;
  flipped: boolean;
  onFlip(): void;
  onConsult(pick: ReunionPick): void;
};

/** "2026-09-25" → "9/25" */
export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

/** 付箋に出す本人の言葉（書き換えない。本文が空なら深掘りの答え） */
function quoteOf(t: ThoughtSummary): string {
  return t.rawText.trim() ? t.rawText : t.deepDiveAnswer;
}

export default function ReunionNote({ pick, flipped, onFlip, onConsult }: Props) {
  if (pick === undefined) {
    return <div className={styles.reunion} aria-hidden="true" />;
  }

  if (pick === null) {
    return (
      <div className={`${styles.reunion} ${styles.waiting}`}>
        <div className={styles.fl}>
          <div className={`${styles.fc} ${styles.front}`}>
            <span className={styles.tape} />
            <div className={styles.big}>
              <Icon name="corner" />
            </div>
            <div className={styles.frontTitle}>今日の1枚</div>
            <div className={styles.frontSub}>記録が5つたまると、過去のあなたから1枚届くよ</div>
          </div>
        </div>
      </div>
    );
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || flipped) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFlip();
    }
  };

  return (
    <div
      className={`${styles.reunion} ${flipped ? styles.flipped : ""}`}
      role={flipped ? undefined : "button"}
      tabIndex={flipped ? undefined : 0}
      aria-label={flipped ? undefined : `${pick.label}の言葉をめくる`}
      onClick={flipped ? undefined : onFlip}
      onKeyDown={onKey}
    >
      <div className={styles.fl}>
        <div className={`${styles.fc} ${styles.front}`} aria-hidden={flipped}>
          <span className={styles.tape} />
          <div className={styles.big}>
            <Icon name="corner" />
          </div>
          <div className={styles.frontTitle}>今日の1枚</div>
        </div>
        <div className={`${styles.fc} ${styles.back}`} aria-hidden={!flipped}>
          <span className={styles.tape} />
          <span className={styles.chip}>
            {pick.label} ・ {shortDate(pick.thought.date)}
          </span>
          <div className={styles.qt}>
            <span>{quoteOf(pick.thought)}</span>
          </div>
          {flipped && (
            <span className={styles.consult}>
              <RoundButton
                variant="green"
                icon="swirl"
                label="相談する"
                aria-label="このことを相談する"
                onClick={() => onConsult(pick)}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
