"use client";

import { useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import LimitCounter from "@/components/ui/LimitCounter";
import MentorNote from "./MentorNote";
import styles from "./record.module.css";

type Field = {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  shaking: boolean;
};

type Props = {
  step: 1 | 2 | 3;
  diary: Field;
  answer: Field;
  /** 深掘りの1問（緑インク）。"" なら出さない */
  question: string;
  /** 言い換えのお願いなど、深掘り以外のメンターの一言 */
  note?: string;
  /** 紙の上の赤インク（エラー） */
  error?: string;
  onDismissError?: () => void;
  readOnly?: boolean;
  placeholder?: string;
  answerPlaceholder?: string;
  counter: { length: number; max: number; warnAt: number };
  /** 封をしたとき紙が沈む */
  sunk?: boolean;
  /** 紙のふちに載せるもの（しおり） */
  top?: ReactNode;
  /** 紙の上に重ねるもの（封蝋） */
  overlay?: ReactNode;
};

/** 罫線ノートと赤い余白線の紙。日記 → メンターの1問 → 答え。プロトタイプ #recPaper */
export default function RecordSheet({
  step,
  diary,
  answer,
  question,
  note,
  error,
  onDismissError,
  readOnly,
  placeholder,
  answerPlaceholder,
  counter,
  sunk,
  top,
  overlay,
}: Props) {
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const diaryRef = useRef<HTMLTextAreaElement>(null);

  // 深掘りの1問が出たら、少し待って答えの欄へ（プロトタイプ：300ms 後に focus）
  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => answerRef.current?.focus({ preventScroll: true }), 300);
    return () => clearTimeout(t);
  }, [step]);

  // 深掘りに進んだら、日記の欄は最後の行が見えるように
  useEffect(() => {
    if (step === 2 && diaryRef.current) diaryRef.current.scrollTop = diaryRef.current.scrollHeight;
  }, [step]);

  const showAnswer = step >= 2;

  return (
    <div className={styles.paperWrap}>
      {top}
      <div className={["sheet", styles.paper, sunk ? styles.sunk : ""].filter(Boolean).join(" ")}>
        <div className={styles.lines}>
          <textarea
            ref={diaryRef}
            aria-label="日記"
            value={diary.value}
            onChange={diary.onChange}
            readOnly={readOnly || step !== 1}
            placeholder={placeholder}
            className={[
              styles.ta,
              "rule-lines",
              step === 1 ? styles.taGrow : styles.taDiaryFixed,
              diary.shaking ? "shake" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          {note && step === 1 && <MentorNote text={note} />}
          {showAnswer && question && <MentorNote text={question} />}
          {showAnswer && (
            <textarea
              ref={answerRef}
              aria-label="深掘りへの答え"
              value={answer.value}
              onChange={answer.onChange}
              readOnly={readOnly || step !== 2}
              placeholder={answerPlaceholder}
              className={[styles.ta, "rule-lines", styles.taGrow, styles.taAnswer, answer.shaking ? "shake" : ""]
                .filter(Boolean)
                .join(" ")}
            />
          )}
          {error && (
            <p className={styles.error} role="alert">
              ※ {error}
              {onDismissError && (
                <button type="button" className={styles.errorX} aria-label="エラーを閉じる" onClick={onDismissError}>
                  ×
                </button>
              )}
            </p>
          )}
        </div>
        <LimitCounter {...counter} className={styles.counter} />
      </div>
      {overlay}
    </div>
  );
}

export { RecordSheet };
