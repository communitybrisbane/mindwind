"use client";

// 三つ折りの便箋（CSS 3D。プロトタイプ #letter）。
// 3枚の紙が折り目でつながる：P1 の下端に P2、P2 の下端に P3 がぶら下がり、折りたたみでは
// P2 を上へ（rotateX 180°）、P3 を下から（-180°）重ねる。折り返した紙は translateZ でわずかにずらし、
// 各面は backface-visibility:hidden。開くときは P2 → P3 の順に1枚ずつ折り目で開く（.go の遅延）。
// 本文は API の blocks / refs をそのまま出す（書き換えない）。宛名と日付だけ画面側で作る。

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import Bead from "@/components/ui/Bead";
import type { Letter, LetterBlock } from "@/lib/db/types";
import { splitIntoPanels } from "@/lib/db/useLetter";
import { dayOfWeek } from "@/lib/logic/week";
import Slip from "./Slip";
import styles from "./letter.module.css";

const DAY = ["日", "月", "火", "水", "木", "金", "土"] as const;
/** 1枚の高さの最小（プロトタイプ --H） */
const MIN_H = 420;

/** "2026-10-25" → "2026.10.25 日" */
export function letterDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  if (!y || !m || !d) return "";
  return `${y}.${m}.${d} ${DAY[dayOfWeek(dateKey)]}`;
}

function Blocks({ blocks, letter, quoteStart }: { blocks: LetterBlock[]; letter: Letter; quoteStart: number }) {
  // 切れ端は1枚ごとに傾きとテープの色を交互にする（便箋全体での通し番号）
  const quoteNo = blocks.map((_, i) => quoteStart + blocks.slice(0, i).filter((x) => x.type === "quote").length);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "text") {
          return (
            <p key={i} className="pen">
              {b.text}
            </p>
          );
        }
        return <Slip key={i} refItem={letter.refs[b.ref]} alt={quoteNo[i] % 2 === 1} />;
      })}
    </>
  );
}

/** 1枚目の中身（日付・宛名・最初の段落・今週の玉）。封筒の中の手紙（プレビュー）にも使う */
export function LetterHead({
  letter,
  name,
  blocks,
  showStamps,
}: {
  letter: Letter;
  name: string;
  blocks: LetterBlock[];
  showStamps: boolean;
}) {
  return (
    <>
      <p className={`pen ${styles.date}`}>{letterDateLabel(letter.to)}</p>
      <p className={`pen ${styles.to}`}>{name ? `${name}へ` : " "}</p>
      <Blocks blocks={blocks} letter={letter} quoteStart={0} />
      <div className={styles.stamps} aria-label="今週の玉">
        {showStamps &&
          letter.moods.slice(0, 7).map((m, k) =>
            m === null || m === undefined ? (
              <div key={k} className={styles.dash} aria-hidden="true" />
            ) : (
              <div
                key={k}
                className={styles.stamp}
                style={{ animationDelay: `${0.4 + k * 0.12}s`, rotate: `${((k * 37) % 9) - 4}deg` }}
              >
                <Bead mood={m} size={42} />
              </div>
            )
          )}
      </div>
    </>
  );
}

function Sign() {
  return (
    <div className={`pen ${styles.sign}`}>
      MindWind
      <svg viewBox="0 0 58 34" aria-hidden="true">
        <path d="M4 22C14 22 18 10 30 14C38 17 34 26 28 24" />
        <path d="M6 30C20 29 40 31 54 27" />
      </svg>
    </div>
  );
}

export type Letter3DProps = {
  letter: Letter;
  /** 宛名（「風見さん」など） */
  name: string;
  /** 折りたたんだまま */
  folded: boolean;
  /** 開く動き（1枚ずつの遅延）を付ける */
  going: boolean;
  /** 3枚ぶんの高さにする（開いたあと） */
  opened: boolean;
  /** 今週の玉を出す（出したときにポンと押される） */
  showStamps: boolean;
  ref?: Ref<HTMLDivElement>;
};

export default function Letter3D({ letter, name, folded, going, opened, showStamps, ref }: Letter3DProps) {
  const panels = useMemo(() => splitIntoPanels(letter.blocks), [letter.blocks]);
  const q1 = panels[0].filter((b) => b.type === "quote").length;
  const q2 = q1 + panels[1].filter((b) => b.type === "quote").length;

  // 一番長い面に合わせて1枚の高さを決める（三つ折りは3枚とも同じ高さ）
  const bodies = useRef<Array<HTMLDivElement | null>>([]);
  const [h, setH] = useState(MIN_H);
  useLayoutEffect(() => {
    const measure = () => {
      const max = Math.max(0, ...bodies.current.map((el) => el?.scrollHeight ?? 0));
      setH(Math.max(MIN_H, Math.ceil(max + 34 + 28)));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    bodies.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [panels, name]);

  const cls = [styles.letter, folded ? styles.fold : "", going ? styles.go : "", opened ? styles.opened : ""]
    .filter(Boolean)
    .join(" ");
  const body = (i: number, children: ReactNode) => (
    <div
      className={styles.body}
      ref={(el) => {
        bodies.current[i] = el;
      }}
    >
      {children}
    </div>
  );

  return (
    <div ref={ref} className={cls} style={{ "--H": `${h}px` } as CSSProperties}>
      <div className={`${styles.P} ${styles.P1}`}>
        <div className={styles.sh} />
        <div className={`${styles.face} ${styles.fr}`}>
          {body(0, <LetterHead letter={letter} name={name} blocks={panels[0]} showStamps={showStamps} />)}
        </div>
        <div className={`${styles.P} ${styles.P2}`}>
          <div className={styles.sh} />
          <div className={`${styles.face} ${styles.bk}`} />
          <div className={`${styles.face} ${styles.fr}`}>
            {body(1, <Blocks blocks={panels[1]} letter={letter} quoteStart={q1} />)}
          </div>
          <div className={`${styles.P} ${styles.P3}`}>
            <div className={styles.sh} />
            <div className={`${styles.face} ${styles.bk}`} />
            <div className={`${styles.face} ${styles.fr}`}>
              {body(
                2,
                <>
                  <Blocks blocks={panels[2]} letter={letter} quoteStart={q2} />
                  <Sign />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
