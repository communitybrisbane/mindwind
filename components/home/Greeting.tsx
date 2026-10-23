"use client";

// ホーム上部：日付・挨拶（呼び名）・今週◯日（数字が回る）・歯車。
// 休み明け（直近の記録から3日以上）は「おかえり」。責めない文言にする（0日でも数字で詰めない）。

import type { ReactNode } from "react";
import styles from "./home.module.css";

type Props = {
  /** 「10月25日 日曜日」。未確定（SSR）なら "" */
  dateLabel: string;
  /** 「こんにちは」「おかえり」など */
  hello: string;
  /** 表示用の呼び名（「風見さん」）。未確定なら "" */
  name: string;
  /** 今週の記録日数。null＝読み込み中 */
  count: number | null;
  /** 回る前の数字（増えたときだけ）。null＝回さない */
  rollFrom: number | null;
  /** true で rollFrom → count へ回す */
  rolled: boolean;
  /** プロフィールで「今週◯日」を隠している */
  hideCount: boolean;
  /** 右端（歯車） */
  gear: ReactNode;
};

export default function Greeting({ dateLabel, hello, name, count, rollFrom, rolled, hideCount, gear }: Props) {
  return (
    <header className={styles.top}>
      <div className={styles.hello}>
        <div className={styles.sm}>{dateLabel || " "}</div>
        <h1 className={styles.hi}>{name ? `${hello}、${name}` : " "}</h1>
      </div>
      {!hideCount && count !== null && <WeekCount count={count} rollFrom={rollFrom} rolled={rolled} />}
      {gear}
    </header>
  );
}

function WeekCount({ count, rollFrom, rolled }: { count: number; rollFrom: number | null; rolled: boolean }) {
  if (count === 0) {
    // 今週まだ書いていない：数字の 0 は出さない（責めない）
    return (
      <div className={styles.count}>
        <div className={`${styles.sm} ${styles.countLabel}`}>今週</div>
        <span className={styles.soft}>これから</span>
      </div>
    );
  }
  const rolling = rollFrom !== null && rollFrom !== count;
  return (
    <div className={styles.count} aria-label={`今週${count}日`} role="img">
      <div className={`${styles.sm} ${styles.countLabel}`} aria-hidden="true">
        今週
      </div>
      <span className={styles.n} aria-hidden="true">
        <span className={`${styles.roll} ${rolling && rolled ? styles.rolled : ""}`}>
          {rolling ? (
            <>
              <span>{rollFrom}</span>
              <span>{count}</span>
            </>
          ) : (
            <span>{count}</span>
          )}
        </span>
      </span>
      <span className={styles.unit} aria-hidden="true">
        日
      </span>
    </div>
  );
}
