"use client";

// 風の強さで変わる雰囲気（PLAN 84）。app/layout.tsx のシェルの直下に1つだけ置く。
// - fxBus を受ける：preview＝うっすら（セット）／burst＝グワッ（決定）／spin＝静まる／clear＝消す
// - 背景の色は2枚を重ねて、なめらかに入れ替える（lib/ui/fxParticles.ts の nextAmbience）
// - 決めたあとのその日いっぱい（Asia/Tokyo）は、背景に風の色をうっすら残す（粒子は出さない。色だけ）
// - 「動きをへらす」では色の変化だけ（粒子・弾み・明るさ・揺れ・振動・音は出さない）
// 画面には触れない（pointer-events: none）。

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { MoodId } from "@/lib/logic/moods";
import { fxBus, type FxEvent } from "@/lib/ui/fxBus";
import { sound, vibrate } from "@/lib/ui/feedback";
import {
  AMB_INITIAL,
  AMB_OPACITY,
  dimAmbience,
  fxPlan,
  nextAmbience,
  residualOpacity,
  type AmbLayer,
  type AmbState,
  type FxFlash,
  type FxShell,
} from "@/lib/ui/fxParticles";
import { getTodayMoodSnapshot, subscribeTodayMood } from "@/lib/ui/useTodayMood";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";
import { MoodFx, type MoodFxRun } from "./MoodFx";
import styles from "./fx.module.css";

const MOOD_CLASS: Record<MoodId, string> = {
  0: styles.a0,
  1: styles.a1,
  2: styles.a2,
  3: styles.a3,
  4: styles.a4,
};
const FLASH_CLASS: Record<FxFlash, string> = {
  warm: styles.warm,
  hush: styles.hush,
  lightning: styles.lightning,
};
const SHELL_CLASS: Record<FxShell, string> = {
  shake: styles.shake,
  sway: styles.sway,
  calm: styles.calm,
};

/** 回転盤（と起動画面）では、その日の残り香を出さない（回転盤が自分で雰囲気を出す） */
function showsResidual(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname !== "/" && pathname !== "/mood";
}

/** 色の板1枚。グワッのたびに弾む（クラスを付け直してアニメーションを最初から） */
function AmbPlate({ layer }: { layer: AmbLayer }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove(styles.burst);
    void el.offsetWidth;
    el.classList.add(styles.burst);
  }, [layer.burstKey]);
  const cls = [styles.amb, layer.mood !== null ? MOOD_CLASS[layer.mood] : ""].join(" ");
  return <div ref={ref} className={cls} style={{ opacity: layer.opacity }} />;
}

export function AmbienceLayer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [amb, setAmb] = useState<AmbState>(AMB_INITIAL);
  const [run, setRun] = useState<MoodFxRun | null>(null);
  const [flash, setFlash] = useState<{ kind: FxFlash; id: number } | null>(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  const pathname = usePathname();
  // 画面を移ったら粒子と明るさを消す（描画中に前の値と比べて直す。effect で state を消さない）
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setRun(null);
    setFlash(null);
  }
  const pathRef = useRef(pathname);
  const timers = useRef<number[]>([]);
  const runId = useRef(0);
  /** fxBus の演出中（画面移動まで）は、残り香で上書きしない */
  const active = useRef(false);

  const shell = useCallback(() => rootRef.current?.parentElement ?? null, []);

  const clearShell = useCallback(() => {
    const el = shell();
    if (el) for (const c of Object.values(SHELL_CLASS)) el.classList.remove(c);
  }, [shell]);

  /** 揺れと待ちを止める（state には触れない） */
  const stopMotion = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    clearShell();
  }, [clearShell]);

  /** プロトタイプ stopFx：粒子・明るさ・揺れ・待ちを止める（色は残す） */
  const stopFx = useCallback(() => {
    stopMotion();
    setRun(null);
    setFlash(null);
  }, [stopMotion]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /** その日の残り香（決めた風の色をうっすら） */
  const applyResidual = useCallback(() => {
    if (active.current) return;
    const { mood } = getTodayMoodSnapshot();
    if (mood === null || !showsResidual(pathRef.current)) {
      setAmb((s) => nextAmbience(s, null, 0));
      return;
    }
    setAmb((s) => nextAmbience(s, mood, residualOpacity(mood)));
  }, []);

  /** プロトタイプ startFx：うっすら（full=false）／グワッ（full=true） */
  const startFx = useCallback(
    (mood: MoodId, full: boolean) => {
      stopFx();
      active.current = true;
      const rm = reducedRef.current;
      setAmb((s) => nextAmbience(s, mood, full ? AMB_OPACITY.burst : AMB_OPACITY.preview, full && !rm));
      if (rm) return; // 動きをへらす：色の変化だけ
      if (mood !== 2) setRun({ mood, full, id: ++runId.current });

      const plan = fxPlan(mood, full, rm);
      if (plan.flash) {
        const kind = plan.flash;
        const show = () => setFlash({ kind, id: ++runId.current });
        if (plan.flashDelayMs > 0) later(plan.flashDelayMs, show);
        else show();
      }
      if (plan.shell) {
        const cls = SHELL_CLASS[plan.shell];
        const add = () => shell()?.classList.add(cls);
        if (plan.shellDelayMs > 0) later(plan.shellDelayMs, add);
        else add();
        if (plan.shellMs !== null) later(plan.shellMs, () => shell()?.classList.remove(cls));
      }
      if (plan.vibrate !== null) vibrate(plan.vibrate);
      if (plan.sound) sound(plan.sound);
    },
    [later, shell, stopFx]
  );

  // fxBus を受ける
  useEffect(() => {
    const onFx = (e: FxEvent) => {
      switch (e.type) {
        case "preview":
          startFx(e.mood, false);
          break;
        case "burst":
          startFx(e.mood, true);
          break;
        case "spin":
          // 回している間は、いったん静まる
          stopFx();
          active.current = true;
          setAmb((s) => dimAmbience(s));
          break;
        case "clear":
          stopFx();
          active.current = true;
          setAmb((s) => nextAmbience(s, null, 0));
          break;
      }
    };
    return fxBus.subscribe(onFx);
  }, [startFx, stopFx]);

  // 画面を移ったら演出を止め、その日の残り香に戻す（プロトタイプ go → stopFx・ambLight）
  useEffect(() => {
    pathRef.current = pathname;
    stopMotion();
    active.current = false;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) applyResidual();
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, stopMotion, applyResidual]);

  // 今日の気分が決まった・変わった・日付が変わった
  useEffect(() => subscribeTodayMood(applyResidual), [applyResidual]);

  // 「動きをへらす」に切り替わったら、動いているものを止める（色はそのまま）
  useEffect(() => {
    reducedRef.current = reduced;
    if (reduced) stopMotion();
  }, [reduced, stopMotion]);

  // 片付け
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
      clearShell();
    },
    [clearShell]
  );

  // 「動きをへらす」に切り替わったら、動いているものを消す（色はそのまま）
  if (reduced && (run || flash)) {
    setRun(null);
    setFlash(null);
  }

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <AmbPlate layer={amb.layers[0]} />
      <AmbPlate layer={amb.layers[1]} />
      {flash && !reduced && <div key={flash.id} className={`${styles.flash} ${FLASH_CLASS[flash.kind]}`} />}
      <MoodFx run={reduced ? null : run} />
    </div>
  );
}

export default AmbienceLayer;
