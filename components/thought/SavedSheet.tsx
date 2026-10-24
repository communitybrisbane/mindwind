"use client";

import type { ChangeEvent } from "react";
import LimitCounter from "@/components/ui/LimitCounter";
import type { ThoughtSummary } from "@/lib/db/types";
import styles from "./thought.module.css";

export type SavedSheetField = {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  shaking: boolean;
  counter: { length: number; max: number; warnAt: number };
};

type Props = {
  thought: ThoughtSummary;
  /** 編集中は本文（と深掘りの答え）を直す欄になる */
  editing?: boolean;
  rawField?: SavedSheetField;
  answerField?: SavedSheetField;
  /** 一言を「あとから深掘りする」間：一言の下に問い（緑インク）と答えの欄を出す。question が "" の間は用意中 */
  deepen?: { question: string; answerField: SavedSheetField; readOnly?: boolean };
};

/**
 * 保存済みの記録の中身：本人の文章（罫線の上・Yomogi）＋深掘りの問い（緑インクの余白メモ）と答え。
 * 表示は rawText / deepDiveAnswer をそのまま出す（AI は書き換えない）。
 */
export default function SavedSheet({ thought, editing, rawField, answerField, deepen }: Props) {
  const hasDeepDive = thought.deepDiveQuestion !== "";

  if (editing && rawField) {
    return (
      <div className={styles.body}>
        <div className={styles.fieldWrap}>
          <textarea
            aria-label={thought.kind === "quick" ? "一言" : "日記"}
            value={rawField.value}
            onChange={rawField.onChange}
            className={[styles.ta, "rule-lines", rawField.shaking ? "shake" : ""].filter(Boolean).join(" ")}
            rows={thought.kind === "quick" ? 2 : 6}
          />
          <LimitCounter {...rawField.counter} className={styles.counter} />
        </div>
        {hasDeepDive && answerField && (
          <>
            <p className={["mnote", styles.q].join(" ")}>{thought.deepDiveQuestion}</p>
            <div className={styles.fieldWrap}>
              <textarea
                aria-label="深掘りへの答え"
                value={answerField.value}
                onChange={answerField.onChange}
                className={[styles.ta, "rule-lines", answerField.shaking ? "shake" : ""].filter(Boolean).join(" ")}
                rows={3}
              />
              <LimitCounter {...answerField.counter} className={styles.counter} />
            </div>
          </>
        )}
      </div>
    );
  }

  if (deepen) {
    return (
      <div className={styles.body}>
        <p className={[styles.text, "rule-lines"].join(" ")}>{thought.rawText}</p>
        {deepen.question ? (
          <>
            <p className={["mnote", styles.q].join(" ")}>{deepen.question}</p>
            <div className={styles.fieldWrap}>
              <textarea
                aria-label="深掘りへの答え"
                value={deepen.answerField.value}
                onChange={deepen.answerField.onChange}
                readOnly={deepen.readOnly}
                placeholder="ここに答えを書いてね…"
                autoFocus
                className={[styles.ta, "rule-lines", deepen.answerField.shaking ? "shake" : ""].filter(Boolean).join(" ")}
                rows={3}
              />
              <LimitCounter {...deepen.answerField.counter} className={styles.counter} />
            </div>
          </>
        ) : (
          <p className={styles.wait}>メンターが読んでいるよ…</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <p className={[styles.text, "rule-lines"].join(" ")}>{thought.rawText}</p>
      {hasDeepDive && (
        <>
          <p className={["mnote", styles.q].join(" ")}>{thought.deepDiveQuestion}</p>
          {thought.deepDiveAnswer && (
            <p className={[styles.text, "rule-lines"].join(" ")}>{thought.deepDiveAnswer}</p>
          )}
        </>
      )}
    </div>
  );
}

export { SavedSheet };
