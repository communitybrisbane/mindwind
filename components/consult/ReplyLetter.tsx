"use client";

import { Paper } from "@/components/ui/Paper";
import styles from "./consult.module.css";

type Props = {
  text: string;
  /** まだ書かれている途中（緑インクのキャレットを出し、署名は書き終えてから） */
  streaming?: boolean;
  /** 返事を書き始める前（記録を読み返しているところ） */
  thinking?: boolean;
};

/** メンターの返事（便箋・緑インク）。ストリーミングで1文字ずつ書かれていく */
export default function ReplyLetter({ text, streaming = false, thinking = false }: Props) {
  return (
    <Paper as="article" className={styles.mrep} aria-label="メンターの返事">
      {thinking ? (
        <p className={styles.thinkingText} role="status">
          記録を読み返している…
        </p>
      ) : (
        <div className={styles.mrepText} aria-live={streaming ? "polite" : undefined}>
          {text}
          {streaming && <span className={styles.caret} aria-hidden="true" />}
        </div>
      )}
      <div className={styles.sgn}>{!thinking && !streaming ? "MindWind" : ""}</div>
    </Paper>
  );
}
