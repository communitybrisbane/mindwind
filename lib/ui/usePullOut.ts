"use client";

// 手紙を親指で封筒から引っぱり出す判定（PLAN 78）。
// 純粋ロジック（距離・戻る・確定）と、それを pointer イベントにつなぐ hook を分けて置く。
// 動きはプロトタイプ ui-v5.html の #pullHit のとおり：
//   フタが開くと手紙は 46px だけ顔を出す → 上へ引くと d だけ上がる（最大 340）
//   → 離したとき d > 95 ならそのまま出る／それ以下なら元へ戻る／ほとんど動かさなければタップ扱いで出る

import { useCallback, useRef, useState, type PointerEvent } from "react";

/** フタが開いたとき、手紙が封筒から顔を出す量（px） */
export const PULL_REST = 46;
/** 引っぱれる最大量（px） */
export const PULL_MAX = 340;
/** これを超えて離すと、そのまま出る（px） */
export const PULL_THRESHOLD = 95;
/** これ以下の動きはタップとみなす（px） */
export const PULL_SLOP = 5;
/** この間隔ごとに紙のこすれる手ざわりを返す（px） */
export const PULL_TICK = 28;

/** 押した位置と今の位置から、上へ引いた量（0〜PULL_MAX）。scale は画面の拡大率（既定 1） */
export function pullDistance(startY: number, currentY: number, scale = 1): number {
  const k = scale > 0 ? scale : 1;
  const d = (startY - currentY) / k;
  if (!Number.isFinite(d)) return 0;
  return Math.max(0, Math.min(PULL_MAX, d));
}

/** タップではなく引っぱったとみなせるか */
export function hasMoved(d: number): boolean {
  return d > PULL_SLOP;
}

/** 離したときの結果。引いた量が閾値を超える・またはタップなら "out"（出る）、それ以外は "back"（戻る） */
export function pullDecision(d: number, moved: boolean): "out" | "back" {
  if (!moved) return "out";
  return d > PULL_THRESHOLD ? "out" : "back";
}

/** 手ざわり（振動・音）を返す段の番号。番号が変わったら1回鳴らす */
export function pullTick(d: number): number {
  return Math.floor(Math.max(0, d) / PULL_TICK);
}

/** 手紙の translateY（px）。引いた量 d のとき */
export function pullTranslate(d: number): number {
  return -(PULL_REST + Math.max(0, d));
}

export type PullOutHandlers = {
  onPointerDown(e: PointerEvent<HTMLElement>): void;
  onPointerMove(e: PointerEvent<HTMLElement>): void;
  onPointerUp(e: PointerEvent<HTMLElement>): void;
  onPointerCancel(e: PointerEvent<HTMLElement>): void;
};

/**
 * 引っぱり出す hook。enabled のあいだだけ反応する。
 * - offset：今の引いた量（px）。dragging 中は transition を切る
 * - onOut：出ると決まったとき1回
 * - onTick：段が変わるたび（振動・音）
 */
export function usePullOut(opts: {
  enabled: boolean;
  onOut: () => void;
  onTick?: () => void;
}): { offset: number; dragging: boolean; handlers: PullOutHandlers } {
  const { enabled, onOut, onTick } = opts;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const ref = useRef({ startY: 0, d: 0, moved: false, tick: 0, active: false });

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // 古いブラウザ：capture できなくても続ける
      }
      ref.current = { startY: e.clientY, d: 0, moved: false, tick: 0, active: true };
      setDragging(true);
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const s = ref.current;
      if (!enabled || !s.active) return;
      s.d = pullDistance(s.startY, e.clientY);
      if (hasMoved(s.d)) s.moved = true;
      const t = pullTick(s.d);
      if (t !== s.tick) {
        s.tick = t;
        onTick?.();
      }
      setOffset(s.d);
    },
    [enabled, onTick]
  );

  const onPointerUp = useCallback(() => {
    const s = ref.current;
    if (!enabled || !s.active) return;
    s.active = false;
    setDragging(false);
    if (pullDecision(s.d, s.moved) === "out") {
      onOut();
    } else {
      setOffset(0);
    }
  }, [enabled, onOut]);

  const onPointerCancel = useCallback(() => {
    const s = ref.current;
    if (!s.active) return;
    s.active = false;
    setDragging(false);
    setOffset(0);
  }, []);

  return { offset, dragging, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
}
