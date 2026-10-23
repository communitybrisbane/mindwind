"use client";

// 起動画面（PLAN 83）。docs/prototype/ui-v5.html の起動画面を写したもの。
// 革の机に紙のカードが落ちる → 「mind」が1文字ずつにじむ → 鏡像の「wind」が落ちる → 風が横切る
// → コンセプトの一行 → 「タップしてスタート」が明滅し、その上で波紋が広がる。
// どこをタップしても進む（途中のタップは演出を飛ばす）。「動きをへらす」では静止画。
// 進み先：今日の気分が未設定なら /mood（回転盤）、設定済みなら /home。
// 認証は裏で匿名ログイン（useEnsureUser）。従来の「Google ではじめる／ゲストで試す」は廃止。

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Desk } from "@/components/ui/Desk";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useEnsureUser } from "@/lib/ui/useEnsureUser";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";
import { useTodayMood } from "@/lib/ui/useTodayMood";
import { isFirstLaunchOfDay, todayKeyOf } from "@/lib/logic/moodDay";
import {
  BREEZE_PATHS,
  LOGO_LETTERS,
  LOGO_ORIGIN,
  LOGO_REVEAL,
  LOGO_SCALE,
  LOGO_VIEWBOX,
} from "./logo";
import styles from "./Splash.module.css";

/** 演出の長さ（プロトタイプ startSplash の 4700ms） */
const PLAY_MS = 4700;
/** カードが上へ去るのを待ってから進む（プロトタイプ splashTap の 650ms） */
const LEAVE_MS = 650;
/** 気分の取得を待つ上限。過ぎたら回転盤へ進む（回転盤側で取り直す） */
const MOOD_WAIT_MS = 4000;
/** 回転盤を今日すでに出したか（契約 §1-1。/mood が開いたときに書く） */
const PROMPTED_KEY = "mindwind:moodPromptedOn";

/** 契約 §1-1：今日の気分が null で、この端末で今日まだ回転盤を出していないときだけ /mood */
function nextRoute(mood: number | null): "/mood" | "/home" {
  if (mood !== null) return "/home";
  let promptedOn: string | null = null;
  try {
    promptedOn = localStorage.getItem(PROMPTED_KEY);
  } catch {
    promptedOn = null;
  }
  return isFirstLaunchOfDay(promptedOn, todayKeyOf()) ? "/mood" : "/home";
}

type Phase = "play" | "done" | "leaving";

const LETTER_CLASS = [styles.lt1, styles.lt2, styles.lt3, styles.lt4];
const BREEZE_CLASS = [styles.br1, styles.br2, styles.br3];

export default function Splash() {
  const router = useRouter();
  const reduced = useReducedMotion();
  // ここで匿名ログインを始めておくと、タップしたときには気分の取得が済んでいることが多い
  const { error: authError } = useEnsureUser();
  const { mood, loading: moodLoading } = useTodayMood();

  const [phase, setPhase] = useState<Phase>("play");
  const [skipped, setSkipped] = useState(false);
  /** タップ済みで、去る動きが終わった（あとは気分の取得を待って進むだけ） */
  const [ready, setReady] = useState(false);
  const navigated = useRef(false);
  const rawId = useId();
  const clipId = `sp-reveal-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // 演出の時間割（音はプロトタイプどおり。最初のタップ前は feedback 側が鳴らさない）
  useEffect(() => {
    if (reduced) return;
    const t1 = setTimeout(() => sound("pon"), 420);
    const t2 = setTimeout(() => setPhase((p) => (p === "play" ? "done" : p)), PLAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced || phase !== "play" || skipped) return;
    const t = setTimeout(() => sound("chime"), 3600);
    return () => clearTimeout(t);
  }, [reduced, phase, skipped]);

  const go = useCallback(
    (to: "/mood" | "/home") => {
      if (navigated.current) return;
      navigated.current = true;
      router.replace(to);
    },
    [router]
  );

  // 去る動きが終わったら、気分が分かりしだい進む
  useEffect(() => {
    if (!ready) return;
    if (authError) {
      go("/mood");
      return;
    }
    if (!moodLoading) {
      // mood は 0（追い風）も有効な値なので、null かどうかで判定する
      go(nextRoute(mood));
      return;
    }
    const t = setTimeout(() => go("/mood"), MOOD_WAIT_MS);
    return () => clearTimeout(t);
  }, [ready, moodLoading, mood, authError, go]);

  const onTap = useCallback(() => {
    if (phase === "leaving") return;
    // 演出の途中なら、飛ばして「タップしてスタート」を出すだけ
    if (phase === "play" && !reduced) {
      setSkipped(true);
      setPhase("done");
      return;
    }
    vibrate(12);
    sound("pop");
    setPhase("leaving");
    setTimeout(() => setReady(true), reduced ? 0 : LEAVE_MS);
  }, [phase, reduced]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap();
    }
  };

  // 「動きをへらす」では最初から終わりの姿（静止画）
  const shown: Phase = reduced && phase === "play" ? "done" : phase;
  const cls = [
    styles.root,
    !reduced && styles.play,
    shown !== "play" && styles.done,
    shown === "leaving" && styles.leaving,
    skipped && styles.skip,
    reduced && styles.still,
  ]
    .filter(Boolean)
    .join(" ");

  const vb = `${LOGO_VIEWBOX.x} ${LOGO_VIEWBOX.y} ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`;

  return (
    <Desk className="flex flex-1 flex-col">
      <div
        className={cls}
        role="button"
        tabIndex={0}
        aria-label="タップしてスタート"
        onPointerDown={onTap}
        onKeyDown={onKeyDown}
      >
        {BREEZE_PATHS.map((paths, i) => (
          <svg
            key={i}
            className={`${styles.breeze} ${BREEZE_CLASS[i]}`}
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {paths.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
        ))}

        <div className={styles.stage}>
          <div className={`sheet ${styles.card}`}>
            <svg className={styles.logo} viewBox={vb} role="img" aria-label="mindwind">
              <defs>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                  <rect
                    x={LOGO_REVEAL.x}
                    y={LOGO_REVEAL.y}
                    width={LOGO_REVEAL.width}
                    height={LOGO_REVEAL.height}
                  />
                </clipPath>
              </defs>
              <g filter="url(#logoink)" fill="#0b5a3b">
                {/* 「mind」：1文字ずつにじんで現れる */}
                <g
                  transform={`translate(${LOGO_ORIGIN.x} ${LOGO_ORIGIN.mindBaseline}) scale(${LOGO_SCALE} ${-LOGO_SCALE})`}
                >
                  {LOGO_LETTERS.map((l, i) => (
                    <g key={l.x} transform={`translate(${l.x} 0)`}>
                      <path className={`${styles.letter} ${LETTER_CLASS[i]}`} d={l.d} />
                    </g>
                  ))}
                </g>
                {/* 鏡像の「wind」：上から落ちてくる（基準線より上は隠す） */}
                <g clipPath={`url(#${clipId})`}>
                  <g className={styles.wind}>
                    <g
                      transform={`translate(${LOGO_ORIGIN.x} ${LOGO_ORIGIN.windBaseline}) scale(${LOGO_SCALE} ${LOGO_SCALE})`}
                    >
                      {LOGO_LETTERS.map((l) => (
                        <path key={l.x} transform={`translate(${l.x} 0)`} d={l.d} />
                      ))}
                    </g>
                  </g>
                </g>
              </g>
            </svg>
            <div className={styles.tag}>あなたが、自分のメンターになる</div>
          </div>
        </div>

        <div className={styles.tap} aria-hidden="true">
          <div className={styles.ring}>
            <i />
            <i />
            <b />
          </div>
          <div className={styles.tx}>タップしてスタート</div>
        </div>
      </div>
    </Desk>
  );
}
