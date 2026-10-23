"use client";

// 決めたあとの3択（PLAN 64）。丸いアイコンを親指の弧に置く：ここまで（眠る月）／一言（鉛筆・まんなか・大きい）／しっかり（開いたノート）。

import { RoundButton } from "@/components/ui/RoundButton";
import styles from "./mood.module.css";

type Props = {
  /** 出す（下からせり上がる） */
  up: boolean;
  onOne: () => void;
  onFull: () => void;
  onLater: () => void;
};

export default function MoodChoices({ up, onOne, onFull, onLater }: Props) {
  return (
    <div className={`${styles.choices} ${up ? styles.up : ""}`} aria-hidden={!up}>
      <div className={`${styles.choice} ${styles.cLater}`}>
        <RoundButton
          variant="chalk"
          icon="moon"
          label="ここまで"
          size={68}
          aria-label="今日はここまで"
          onClick={onLater}
          disabled={!up}
        />
      </div>
      <div className={`${styles.choice} ${styles.cOne}`}>
        <RoundButton
          variant="green"
          icon="pencil"
          label="一言"
          size={90}
          aria-label="一言だけ書く"
          onClick={onOne}
          disabled={!up}
        />
      </div>
      <div className={`${styles.choice} ${styles.cFull}`}>
        <RoundButton
          variant="paper"
          icon="book"
          label="しっかり"
          size={68}
          aria-label="しっかり書く"
          onClick={onFull}
          disabled={!up}
        />
      </div>
    </div>
  );
}
