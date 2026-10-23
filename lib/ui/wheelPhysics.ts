// 気分の回転盤の物理（PLAN 63）。React にも DOM にも依存しない純粋関数だけを置く。
// 値はプロトタイプ docs/prototype/ui-v5.html の「① 回転盤」と同じ（N=15・R=250・慣性 430ms・スナップ 85ms）。
// 角度は度（deg）、速度は deg/ms、時間は ms。θ（theta）は盤の回転角で、玉 k の位置角は k*SLOT + θ。

import type { MoodId } from "@/lib/logic/moods";

/** 盤の玉の数（5つの気分 × 3周） */
export const SLOTS = 15;
/** 1スロットの角度 */
export const SLOT_DEG = 360 / SLOTS;
/** 玉の並ぶ円の半径（px。基準フレーム 390×844） */
export const RADIUS = 250;
/** 指の動きに対する回り方の倍率 */
export const DRAG_GAIN = 1.18;
/** 慣性の減衰の時定数（ms） */
export const INERTIA_TAU = 430;
/** この速さ（deg/ms）を下回ったらスナップに移る */
export const SNAP_VELOCITY = 0.012;
/** スナップの追従の時定数（ms） */
export const SNAP_TAU = 85;
/** スナップの終わり（この角度差で止める） */
export const SNAP_EPSILON = 0.04;
/** 弾いたときの最大速度（deg/ms） */
export const MAX_VELOCITY = 1.1;
/** 弾いたとみなす最小速度（これ未満なら慣性を付けずスナップ） */
export const FLING_MIN_VELOCITY = 0.03;
/** 1フレームの最大の時間（タブ切替などで飛ばないように） */
export const MAX_DT = 40;
/** 真ん中の玉とみなす角度（タップで決定できる範囲） */
export const CENTER_TAP_DEG = SLOT_DEG * 0.55;
/** これより外の玉は見せない */
export const VISIBLE_DEG = 70;
/** 最初に回して見せる速さ（起動画面から来たとき） */
export const INTRO_VELOCITY = 0.55;

export type WheelMode = "idle" | "drag" | "inertia" | "snap";

export type WheelState = {
  theta: number;
  vel: number;
  mode: WheelMode;
  /** スナップ先の角度 */
  target: number;
};

export const INITIAL_WHEEL: WheelState = { theta: 0, vel: 0, mode: "idle", target: 0 };

/** 角度を -180〜180 に畳む */
export function normDeg(a: number): number {
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

/** 正の剰余 */
function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** いま真ん中（矢印の下）にある玉の番号（0〜SLOTS-1） */
export function centerIndex(theta: number, slots = SLOTS): number {
  const slot = 360 / slots;
  return mod(Math.round(-theta / slot), slots);
}

/** 玉の番号 → 気分 */
export function moodOfSlot(index: number): MoodId {
  return mod(index, 5) as MoodId;
}

/** いちばん近いスロットの角度（スナップ先） */
export function snapTarget(theta: number, slot = SLOT_DEG): number {
  const t = Math.round(theta / slot) * slot;
  return Object.is(t, -0) ? 0 : t;
}

/** 指の横移動（px）→ 盤の回転角（deg） */
export function dragDelta(dxPx: number, radius = RADIUS, gain = DRAG_GAIN): number {
  return (dxPx / radius) * (180 / Math.PI) * gain;
}

export type PointerSample = { x: number; t: number };

/** 離したときの速度（deg/ms）。直近の数点から求め、±MAX_VELOCITY に収める */
export function releaseVelocity(
  samples: readonly PointerSample[],
  radius = RADIUS,
  gain = DRAG_GAIN,
  max = MAX_VELOCITY,
): number {
  if (samples.length < 2) return 0;
  const a = samples[0];
  const b = samples[samples.length - 1];
  const dt = Math.max(1, b.t - a.t);
  const v = dragDelta(b.x - a.x, radius, gain) / dt;
  return Math.max(-max, Math.min(max, v));
}

/** 離したあとの状態（弾いたなら慣性、そっと離したならスナップ） */
export function release(theta: number, vel: number): WheelState {
  const mode: WheelMode = Math.abs(vel) > FLING_MIN_VELOCITY ? "inertia" : "snap";
  return { theta, vel: mode === "inertia" ? vel : 0, mode, target: snapTarget(theta) };
}

/** 慣性の1ステップ（指数で減速） */
export function stepInertia(
  theta: number,
  vel: number,
  dt: number,
  tau = INERTIA_TAU,
): { theta: number; vel: number } {
  return { theta: theta + vel * dt, vel: vel * Math.exp(-dt / tau) };
}

/** スナップの1ステップ（目標へ寄せる）。done で止まった */
export function stepSnap(
  theta: number,
  target: number,
  dt: number,
  tau = SNAP_TAU,
): { theta: number; done: boolean } {
  const next = theta + (target - theta) * Math.min(1, dt / tau);
  if (Math.abs(target - next) < SNAP_EPSILON) return { theta: target, done: true };
  return { theta: next, done: false };
}

/**
 * 1フレーム進める。stopped は「このフレームでスナップが終わって止まった」（うっすらの演出を出す合図）。
 * drag / idle のときは何もしない。
 */
export function stepWheel(s: WheelState, dtRaw: number): { state: WheelState; stopped: boolean } {
  const dt = Math.max(0, Math.min(MAX_DT, dtRaw));
  if (s.mode === "inertia") {
    const { theta, vel } = stepInertia(s.theta, s.vel, dt);
    if (Math.abs(vel) < SNAP_VELOCITY) {
      return { state: { theta, vel: 0, mode: "snap", target: snapTarget(theta) }, stopped: false };
    }
    return { state: { ...s, theta, vel }, stopped: false };
  }
  if (s.mode === "snap") {
    const { theta, done } = stepSnap(s.theta, s.target, dt);
    if (done) return { state: { theta, vel: 0, mode: "idle", target: theta }, stopped: true };
    return { state: { ...s, theta }, stopped: false };
  }
  return { state: s, stopped: false };
}

export type BeadPose = {
  /** 真ん中からの角度（-180〜180） */
  phi: number;
  /** 盤の中心からの位置（px。y は上が負） */
  x: number;
  y: number;
  /** 真ん中で 1.5 倍に膨らむ */
  scale: number;
  /** 玉の傾き（deg） */
  rotate: number;
  zIndex: number;
  visible: boolean;
};

/** 玉 k の見た目の位置 */
export function beadPose(k: number, theta: number, radius = RADIUS, slot = SLOT_DEG): BeadPose {
  const phi = normDeg(k * slot + theta);
  const d = Math.abs(phi);
  const rad = (phi * Math.PI) / 180;
  return {
    phi,
    x: radius * Math.sin(rad),
    y: -radius * Math.cos(rad),
    scale: 1 + 0.5 * Math.max(0, 1 - d / (slot * 1.15)),
    rotate: phi * 0.25,
    zIndex: Math.round(100 - d),
    visible: d <= VISIBLE_DEG,
  };
}

/** 真ん中の文字のリールの位置（0〜5。整数のときその気分がちょうど真ん中） */
export function reelPosition(theta: number, slot = SLOT_DEG): number {
  return mod(-theta / slot, 5);
}

/** リールのぼかし（px）。速く回っているほど強い */
export function reelBlur(vel: number): number {
  const v = Math.abs(vel);
  return v > 0.12 ? Math.min(2.5, v * 2) : 0;
}

/**
 * 玉をタップしたとき：真ん中なら決定、横なら回してその玉を真ん中へ（スナップ先を返す）。
 */
export function tapAction(
  k: number,
  theta: number,
  slot = SLOT_DEG,
): { kind: "commit"; index: number } | { kind: "rotate"; target: number } {
  const phi = normDeg(k * slot + theta);
  if (Math.abs(phi) < slot * 0.55) return { kind: "commit", index: k };
  return { kind: "rotate", target: snapTarget(theta - phi, slot) };
}

/** タップした点にいちばん近い、見えている玉（無ければ -1） */
export function nearestBead(
  px: number,
  py: number,
  theta: number,
  radius = RADIUS,
  slots = SLOTS,
): number {
  let best = -1;
  let bestD = Infinity;
  for (let k = 0; k < slots; k++) {
    const p = beadPose(k, theta, radius, 360 / slots);
    if (!p.visible) continue;
    const dd = (px - p.x) ** 2 + (py - p.y) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = k;
    }
  }
  return best;
}
