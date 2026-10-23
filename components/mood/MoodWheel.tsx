"use client";

// 気分の回転盤（PLAN 63）。左右になぞって回す・弾くと慣性で回ってスロットに止まる。
// 玉が矢印の下を通るたびにカラカラ（tick）と矢印がはじかれる。真ん中の玉をタップで決定、横の玉は回して真ん中へ。
// 物理は lib/ui/wheelPhysics.ts（純粋関数）。描画は毎フレーム DOM の style を直接書く（React の再描画をしない）。
// 風の雰囲気（84）には fxBus で知らせるだけ：回している間＝spin、止まった（セット）＝preview。決定の burst は画面側。

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import Bead from "@/components/ui/Bead";
import { MOODS } from "@/lib/logic/moods";
import { sound, vibrate } from "@/lib/ui/feedback";
import { fxBus } from "@/lib/ui/fxBus";
import {
  INITIAL_WHEEL,
  INTRO_VELOCITY,
  SLOTS,
  SLOT_DEG,
  beadPose,
  centerIndex,
  dragDelta,
  moodOfSlot,
  nearestBead,
  reelBlur,
  reelPosition,
  release,
  releaseVelocity,
  snapTarget,
  stepWheel,
  tapAction,
  type PointerSample,
  type WheelState,
} from "@/lib/ui/wheelPhysics";
import MoodReel, { REEL_ITEM_HEIGHT } from "./MoodReel";
import styles from "./mood.module.css";

const BEAD_SIZE = 92;
/** これ以上動いたらタップではなくドラッグ */
const TAP_SLOP = 6;

type Props = {
  /** 決める前（回せる）。false にすると止まり、玉を隠す。true に戻すと今の位置から再開 */
  active: boolean;
  /** 開いた直後に、勢いよく回して見せる */
  intro?: boolean;
  /** 動きを減らす（慣性で回さない・最初の回転なし） */
  reducedMotion?: boolean;
  /** 真ん中の玉をタップした。rect は玉の画面上の位置（飛ぶ演出の出発点） */
  onCommit: (index: number, rect: DOMRect) => void;
  /** 最初に触れた（ヒントを消す） */
  onInteract?: () => void;
};

export default function MoodWheel({ active, intro = false, reducedMotion = false, onCommit, onInteract }: Props) {
  const stateRef = useRef<WheelState>(
    intro && !reducedMotion ? { theta: 0, vel: INTRO_VELOCITY, mode: "inertia", target: 0 } : INITIAL_WHEEL,
  );
  const beadRefs = useRef<Array<HTMLDivElement | null>>([]);
  const discRef = useRef<HTMLDivElement>(null);
  const pawlRef = useRef<SVGSVGElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const lastIdxRef = useRef(0); // 初期の θ は常に 0（玉0が真ん中）
  const downRef = useRef<{ x: number; moved: boolean } | null>(null);
  const samplesRef = useRef<PointerSample[]>([]);
  const activeRef = useRef(active);
  const onCommitRef = useRef(onCommit);
  const onInteractRef = useRef(onInteract);

  useEffect(() => {
    onCommitRef.current = onCommit;
    onInteractRef.current = onInteract;
  }, [onCommit, onInteract]);

  const render = useCallback(() => {
    const s = stateRef.current;
    for (let k = 0; k < SLOTS; k++) {
      const el = beadRefs.current[k];
      if (!el) continue;
      const p = beadPose(k, s.theta);
      el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.scale}) rotate(${p.rotate}deg)`;
      el.style.zIndex = String(p.zIndex);
      el.style.opacity = activeRef.current && p.visible ? "1" : "0";
    }
    if (discRef.current) discRef.current.style.transform = `rotate(${s.theta}deg)`;
    if (reelRef.current) {
      reelRef.current.style.transform = `translateY(${-(reelPosition(s.theta) + 5) * REEL_ITEM_HEIGHT}px)`;
      const blur = reelBlur(s.vel);
      reelRef.current.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
    }
    const ci = centerIndex(s.theta);
    if (ci !== lastIdxRef.current) {
      lastIdxRef.current = ci;
      const pawl = pawlRef.current;
      if (pawl) {
        pawl.classList.remove(styles.flick);
        void pawl.getBoundingClientRect();
        pawl.classList.add(styles.flick);
      }
      sound("tick");
      vibrate(5);
    }
    if (hitRef.current) {
      const m = MOODS[moodOfSlot(ci)];
      hitRef.current.setAttribute("aria-valuetext", `${m.name}。${m.stage}${m.description}`);
      hitRef.current.setAttribute("aria-valuenow", String(moodOfSlot(ci)));
    }
  }, []);

  // 決める前は回し続ける。決めたら止めて玉を隠す。戻したら今の位置からスロットへ寄せて再開
  useEffect(() => {
    const wasActive = activeRef.current;
    activeRef.current = active;
    if (!active) {
      downRef.current = null;
      render();
      return;
    }
    if (!wasActive) {
      const s = stateRef.current;
      stateRef.current = { theta: s.theta, vel: 0, mode: "snap", target: snapTarget(s.theta) };
    }
    render();
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (!activeRef.current) return;
      const dt = last ? t - last : 0;
      last = t;
      const { state, stopped } = stepWheel(stateRef.current, dt);
      stateRef.current = state;
      if (stopped) fxBus.preview(moodOfSlot(centerIndex(state.theta)));
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, render]);

  // 動きを減らす設定に変わったら、回っている途中でもすぐスロットに寄せる
  useEffect(() => {
    if (!reducedMotion) return;
    const s = stateRef.current;
    if (s.mode === "inertia") stateRef.current = { ...s, vel: 0, mode: "snap", target: snapTarget(s.theta) };
  }, [reducedMotion]);

  const commitIndex = (k: number) => {
    const el = beadRefs.current[k];
    if (!el) return;
    onCommitRef.current(k, el.getBoundingClientRect());
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return;
    fxBus.spin();
    onInteractRef.current?.();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 取れない環境でも動く
    }
    const now = performance.now();
    downRef.current = { x: e.clientX, moved: false };
    samplesRef.current = [{ x: e.clientX, t: now }];
    stateRef.current = { ...stateRef.current, vel: 0, mode: "drag" };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    if (!down || !activeRef.current) return;
    const samples = samplesRef.current;
    const dx = e.clientX - samples[samples.length - 1].x;
    if (Math.abs(e.clientX - down.x) > TAP_SLOP) down.moved = true;
    stateRef.current = { ...stateRef.current, theta: stateRef.current.theta + dragDelta(dx) };
    samples.push({ x: e.clientX, t: performance.now() });
    if (samples.length > 6) samples.shift();
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    if (!down || !activeRef.current) return;
    downRef.current = null;
    const s = stateRef.current;
    if (!down.moved) {
      // タップ：真ん中の玉なら決定、横の玉なら回してくる
      const o = originRef.current?.getBoundingClientRect();
      const k = o ? nearestBead(e.clientX - o.left, e.clientY - o.top, s.theta) : -1;
      if (k < 0) {
        stateRef.current = { ...s, vel: 0, mode: "snap", target: snapTarget(s.theta) };
        return;
      }
      const act = tapAction(k, s.theta);
      if (act.kind === "commit") {
        stateRef.current = { ...s, vel: 0, mode: "idle", target: s.theta };
        commitIndex(act.index);
      } else {
        stateRef.current = { ...s, vel: 0, mode: "snap", target: act.target };
      }
      return;
    }
    const vel = reducedMotion ? 0 : releaseVelocity(samplesRef.current);
    stateRef.current = release(s.theta, vel);
  };

  const onPointerCancel = () => {
    if (!downRef.current) return;
    downRef.current = null;
    const s = stateRef.current;
    stateRef.current = { ...s, vel: 0, mode: "snap", target: snapTarget(s.theta) };
  };

  // キーボード：左右で1つずつ回す・Enter / Space で真ん中の玉に決める
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!activeRef.current) return;
    const s = stateRef.current;
    const base = s.mode === "snap" ? s.target : snapTarget(s.theta);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      onInteractRef.current?.();
      fxBus.spin();
      const dir = e.key === "ArrowRight" ? -1 : 1;
      stateRef.current = { theta: s.theta, vel: 0, mode: "snap", target: base + dir * SLOT_DEG };
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commitIndex(centerIndex(base));
    }
  };

  return (
    <>
      <MoodReel reelRef={reelRef} hidden={!active} />
      <div className={`${styles.wheelg} ${active ? "" : styles.out}`} aria-hidden="true">
        <div ref={originRef} className={styles.origin}>
          <div ref={discRef} className={styles.disc} />
          <svg ref={pawlRef} className={styles.pawl} viewBox="0 0 36 44">
            <path
              d="M4 2 H32 L18 40 Z"
              fill="#efe2bd"
              stroke="#34322d"
              strokeWidth="1.6"
              strokeLinejoin="round"
              filter="url(#pencil)"
            />
          </svg>
          {Array.from({ length: SLOTS }, (_, k) => (
            <div
              key={k}
              ref={(el) => {
                beadRefs.current[k] = el;
              }}
              className={styles.bead}
            >
              <Bead mood={moodOfSlot(k)} size={BEAD_SIZE} />
            </div>
          ))}
        </div>
      </div>
      <div
        ref={hitRef}
        className={`${styles.hit} ${active ? "" : styles.off}`}
        role="slider"
        tabIndex={active ? 0 : -1}
        aria-label="気分の玉を回して選ぶ"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={0}
        aria-orientation="horizontal"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
      />
    </>
  );
}
