// 風の強さで変わる雰囲気（PLAN 84）の純粋な部分。canvas や DOM に触らない（Vitest 対象）。
// 値はプロトタイプ docs/prototype/ui-v5.html の「風の強さの雰囲気」（mkParts / fxFrame / setAmb）と同じ。
// 座標は幅 390 の論理座標（高さは画面に合わせて H）。描画側（components/fx/MoodFx.tsx）が拡大する。

import type { MoodId } from "@/lib/logic/moods";
import type { SoundName } from "@/lib/ui/feedback";

export const LOGICAL_WIDTH = 390;

export type Rand = () => number;

const between = (rand: Rand, a: number, b: number) => a + rand() * (b - a);

// ---- 粒子 ----

/** 舞う粒（追い風＝花びら／そよ風＝葉）。bvx/bvy は「グワッ」で玉から放射状に飛ぶ速さ */
export type Petal = {
  kind: "petal";
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  r: number;
  vr: number;
  f: number;
  ph: number;
  sw: number;
  c: string;
  bvx?: number;
  bvy?: number;
};
/** 風の筋（向かい風・嵐） */
export type Streak = { kind: "streak"; x: number; y: number; v: number; l: number; a: number };
/** 雨（嵐） */
export type Rain = { kind: "rain"; x: number; y: number; vx: number; vy: number; a: number };
/** 飛ばされる葉（向かい風） */
export type Leaf = { kind: "leaf"; x: number; y: number; v: number; s: number; r: number; vr: number };

export type Particle = Petal | Streak | Rain;

/** 段階ごとの基本の数（プロトタイプ BASE。実際はこの2倍を作り、そのときの強さで描く数を絞る）。凪は無風で 0 */
export const BASE_COUNT: Record<MoodId, number> = { 0: 30, 1: 9, 2: 0, 3: 26, 4: 120 };
/** 嵐に足す風の筋の数 */
export const STORM_STREAKS = 28;
/** 向かい風の葉の数 */
export const HEADWIND_LEAVES = 16;

const PETAL_COLORS = [
  "rgba(255,236,204,.85)",
  "rgba(255,214,170,.8)",
  "rgba(255,246,222,.9)",
  "rgba(250,196,170,.75)",
];
const LEAF_COLORS = ["rgba(176,212,110,.8)", "rgba(214,236,150,.8)", "rgba(140,190,120,.75)"];

/** 粒子の数。quality（0.25〜1）は重い端末で下げる係数。凪は 0（動きを止める） */
export function particleCount(mood: MoodId, quality = 1): number {
  const q = clampQuality(quality);
  return Math.round(BASE_COUNT[mood] * 2 * q);
}

const TWO_PI_ISH = 6.28; // プロトタイプの値のまま（厳密な 2π にはしない）
const MIN_QUALITY = 0.25;

function clampQuality(quality: number): number {
  return clamp(quality, MIN_QUALITY, 1);
}

/** 追い風＝花びら */
function tailwindPetal(i: number, H: number, rand: Rand): Petal {
  return {
    kind: "petal",
    x: between(rand, -20, LOGICAL_WIDTH),
    y: between(rand, 0, H),
    vx: between(rand, 40, 95),
    vy: between(rand, 6, 22),
    s: between(rand, 3.5, 8),
    r: between(rand, 0, TWO_PI_ISH),
    vr: between(rand, -1.4, 1.4),
    f: between(rand, 0.8, 2),
    ph: between(rand, 0, 6),
    sw: between(rand, 10, 30),
    c: PETAL_COLORS[i % PETAL_COLORS.length],
  };
}

/** そよ風＝葉 */
function breezeLeaf(i: number, H: number, rand: Rand): Petal {
  return {
    kind: "petal",
    x: between(rand, -20, LOGICAL_WIDTH),
    y: between(rand, 0, H),
    vx: between(rand, 28, 52),
    vy: between(rand, 5, 16),
    s: between(rand, 5, 9),
    r: between(rand, 0, TWO_PI_ISH),
    vr: between(rand, -0.9, 0.9),
    f: between(rand, 0.6, 1.4),
    ph: between(rand, 0, 6),
    sw: between(rand, 14, 34),
    c: LEAF_COLORS[i % LEAF_COLORS.length],
  };
}

function headwindStreak(H: number, rand: Rand): Streak {
  return {
    kind: "streak",
    x: between(rand, 0, LOGICAL_WIDTH + 30),
    y: between(rand, 0, H),
    v: between(rand, 420, 720),
    l: between(rand, 40, 120),
    a: between(rand, 0.2, 0.38),
  };
}

function stormRain(H: number, rand: Rand): Rain {
  return {
    kind: "rain",
    x: between(rand, 0, LOGICAL_WIDTH + 70),
    y: between(rand, -100, H),
    vy: between(rand, 900, 1400),
    vx: between(rand, -380, -300),
    a: between(rand, 0.26, 0.46),
  };
}

function stormStreak(H: number, rand: Rand): Streak {
  return {
    kind: "streak",
    x: between(rand, 0, LOGICAL_WIDTH + 30),
    y: between(rand, 0, H),
    v: between(rand, 700, 1000),
    l: between(rand, 60, 150),
    a: between(rand, 0.14, 0.26),
  };
}

function headwindLeaf(H: number, rand: Rand): Leaf {
  return {
    kind: "leaf",
    x: between(rand, 0, LOGICAL_WIDTH + 30),
    y: between(rand, 0, H),
    v: between(rand, 260, 420),
    s: between(rand, 3, 6),
    r: between(rand, 0, 6),
    vr: between(rand, -5, 5),
  };
}

export function makeParticles(
  mood: MoodId,
  H: number,
  rand: Rand = Math.random,
  quality = 1
): { parts: Particle[]; leaves: Leaf[] } {
  const n = particleCount(mood, quality);
  const q = clampQuality(quality);
  const parts: Particle[] = [];
  const leaves: Leaf[] = [];
  for (let i = 0; i < n; i++) {
    if (mood === 0) parts.push(tailwindPetal(i, H, rand));
    else if (mood === 1) parts.push(breezeLeaf(i, H, rand));
    else if (mood === 3) parts.push(headwindStreak(H, rand));
    else if (mood === 4) parts.push(stormRain(H, rand));
  }
  if (mood === 3) {
    const nl = Math.round(HEADWIND_LEAVES * q);
    for (let i = 0; i < nl; i++) leaves.push(headwindLeaf(H, rand));
  }
  if (mood === 4) {
    const ns = Math.round(STORM_STREAKS * q);
    for (let i = 0; i < ns; i++) parts.push(stormStreak(H, rand));
  }
  return { parts, leaves };
}

/** 「グワッ」で玉から飛ばす粒の最大数 */
const SCATTER_MAX = 26;

/** 「グワッ」：追い風・そよ風は、最初の最大26粒を玉（cx, cy）から放射状に飛ばす */
export function scatterFromBead(parts: Particle[], cx: number, cy: number, rand: Rand = Math.random): void {
  let done = 0;
  for (const p of parts) {
    if (done >= SCATTER_MAX) break;
    if (p.kind !== "petal") continue;
    const a = between(rand, 0, TWO_PI_ISH);
    const sp = between(rand, 170, 380);
    p.x = cx;
    p.y = cy;
    p.bvx = Math.cos(a) * sp;
    p.bvy = Math.sin(a) * sp * 0.8;
    done++;
  }
}

// ---- 強さ（時間で変わる係数） ----

/** うっすら（セット）＝0.34、グワッ（決定）＝1 */
export function strengthOf(full: boolean): number {
  return full ? 1 : 0.34;
}

/** 決定の瞬間だけ強い（0.9 秒で 1 → 0）。セットのときは 0 */
export function burstAmount(full: boolean, secSinceBurst: number): number {
  return full ? Math.max(0, 1 - Math.max(0, secSinceBurst) / 0.9) : 0;
}

/** いま描く粒の数（作った数のうち、強さに応じた割合） */
export function visibleCount(total: number, k: number, burst: number): number {
  const scale = Math.min(1, (k * (1 + 1.2 * burst)) / 2);
  return Math.min(total, Math.floor(total * scale + 0.5));
}

/** 向かい風の葉の描く数 */
export function visibleLeaves(total: number, k: number, burst: number): number {
  return Math.min(total, Math.floor(total * Math.min(1, k * (1 + burst)) + 0.5));
}

/** 嵐は約3秒で弱まる（3.2 秒まで 1、そこから 2.6 秒かけて 0.28 まで）。セットのときは 1 のまま（もともと弱い） */
export function stormSoftness(full: boolean, sec: number): number {
  if (!full) return 1;
  return sec < 3.2 ? 1 : Math.max(0.28, 1 - (sec - 3.2) / 2.6);
}

/** 1フレームの経過秒（タブ復帰などで飛ばない上限 0.05 秒） */
export function frameDt(nowMs: number, lastMs: number): number {
  return Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
}

// ---- 1フレームの移動（描画はしない） ----

export function stepPetal(p: Petal, dt: number, el: number, H: number, rand: Rand = Math.random): void {
  if (p.bvx !== undefined && p.bvy !== undefined) {
    p.x += p.bvx * dt;
    p.y += p.bvy * dt;
    const d = Math.pow(0.05, dt);
    p.bvx *= d;
    p.bvy *= d;
    if (Math.abs(p.bvx) < 8 && Math.abs(p.bvy) < 8) {
      p.bvx = undefined;
      p.bvy = undefined;
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt + Math.sin(el * p.f + p.ph) * p.sw * dt;
  p.r += p.vr * dt;
  if (p.x > LOGICAL_WIDTH + 20) {
    p.x = -18;
    p.y = between(rand, 0, H * 0.83);
  }
  if (p.y > H + 26) p.y = -20;
  if (p.y < -60) p.y = H + 16;
}

export function stepStreak(p: Streak, dt: number, H: number, gust = 1, spread = 120, rand: Rand = Math.random): void {
  p.x -= p.v * gust * dt;
  if (p.x + p.l < 0) {
    p.x = LOGICAL_WIDTH + between(rand, 0, spread);
    p.y = between(rand, 0, H);
  }
}

export function stepRain(p: Rain, dt: number, H: number, rand: Rand = Math.random): void {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.y > H + 16 || p.x < -40) {
    p.x = between(rand, 0, LOGICAL_WIDTH + 80);
    p.y = between(rand, -80, -10);
  }
}

export function stepLeaf(p: Leaf, dt: number, el: number, H: number, gust = 1, rand: Rand = Math.random): void {
  p.x -= p.v * gust * dt;
  p.y += Math.sin(el * 3 + p.x * 0.02) * 30 * dt;
  p.r += p.vr * dt;
  if (p.x < -12) {
    p.x = LOGICAL_WIDTH + 20;
    p.y = between(rand, 0, H * 0.95);
  }
}

// ---- 重い端末 ----

/** 端末の目安から粒子の係数を決める（コア数・メモリが少ない端末は減らす） */
export function initialQuality(o: { cores?: number; memoryGb?: number }): number {
  let q = 1;
  if (o.cores !== undefined && o.cores > 0 && o.cores <= 4) q = Math.min(q, 0.6);
  if (o.memoryGb !== undefined && o.memoryGb > 0 && o.memoryGb <= 2) q = Math.min(q, 0.5);
  return q;
}

/** 平均フレーム時間（ms）が重ければ係数を下げる（上げはしない）。下限 0.25 */
export function adaptQuality(quality: number, avgFrameMs: number): number {
  if (avgFrameMs > 28) return Math.max(0.25, Math.round(quality * 0.7 * 100) / 100);
  return quality;
}

// ---- 背景の色（2枚重ねの入れ替え） ----

export type AmbLayer = { mood: MoodId | null; opacity: number; burstKey: number };
export type AmbState = { cur: 0 | 1; layers: [AmbLayer, AmbLayer] };

export const AMB_INITIAL: AmbState = {
  cur: 0,
  layers: [
    { mood: null, opacity: 0, burstKey: 0 },
    { mood: null, opacity: 0, burstKey: 0 },
  ],
};

/** 背景の濃さ（プロトタイプ：グワッ 1・うっすら 0.62・回している間 0.22）。残り香は上に重ねるので 0.4 に抑える */
export const AMB_OPACITY = { burst: 1, preview: 0.62, spin: 0.22, residual: 0.4 } as const;

/**
 * プロトタイプ setAmb と同じ入れ替え。
 * - mood が null：両方を消す
 * - 違う風に変わる、またはグワッ：もう一方の板に新しい色を出し、いまの板を消す（なめらかに入れ替わる）
 * - 同じ風：濃さだけ変える
 */
export function nextAmbience(s: AmbState, mood: MoodId | null, opacity: number, burst = false): AmbState {
  if (mood === null) {
    return {
      cur: s.cur,
      layers: [
        { ...s.layers[0], opacity: 0 },
        { ...s.layers[1], opacity: 0 },
      ],
    };
  }
  const cur = s.layers[s.cur];
  if (cur.mood !== mood || cur.opacity === 0 || burst) {
    const nxt: 0 | 1 = s.cur === 0 ? 1 : 0;
    const layers: [AmbLayer, AmbLayer] = [{ ...s.layers[0] }, { ...s.layers[1] }];
    layers[nxt] = {
      mood,
      opacity,
      burstKey: burst ? s.layers[nxt].burstKey + 1 : s.layers[nxt].burstKey,
    };
    layers[s.cur] = { ...layers[s.cur], opacity: 0 };
    return { cur: nxt, layers };
  }
  const layers: [AmbLayer, AmbLayer] = [{ ...s.layers[0] }, { ...s.layers[1] }];
  layers[s.cur] = { ...cur, opacity };
  return { cur: s.cur, layers };
}

/** 回している間：いま出ている色を 0.22 まで静める（出ていなければそのまま） */
export function dimAmbience(s: AmbState): AmbState {
  const cur = s.layers[s.cur];
  if (cur.opacity <= 0) return s;
  const layers: [AmbLayer, AmbLayer] = [{ ...s.layers[0] }, { ...s.layers[1] }];
  layers[s.cur] = { ...cur, opacity: Math.min(cur.opacity, AMB_OPACITY.spin) };
  return { cur: s.cur, layers };
}

/**
 * 決めたあとの1日、背景にうっすら残す濃さ。暗い風（凪・向かい風・嵐）は画面全体を暗くしすぎないよう、さらに薄く。
 * 残り香は画面の上に重ねるので、プロトタイプ ambLight の 0.55 より控えめにする。
 */
export function residualOpacity(mood: MoodId): number {
  if (mood === 0 || mood === 1) return AMB_OPACITY.residual;
  if (mood === 2) return 0.3;
  return 0.22;
}

/** 重い端末で係数を下げたとき、種類ごとの割合を保ったまま粒を減らす（ratio は 0〜1） */
export function trimParticles<T extends { kind: string }>(parts: T[], ratio: number): T[] {
  const r = clamp(ratio, 0, 1);
  if (r >= 1) return parts;
  const total = new Map<string, number>();
  for (const p of parts) total.set(p.kind, (total.get(p.kind) ?? 0) + 1);
  const keep = new Map<string, number>();
  total.forEach((n, k) => keep.set(k, Math.round(n * r)));
  const out: T[] = [];
  for (const p of parts) {
    const left = keep.get(p.kind) ?? 0;
    if (left > 0) {
      out.push(p);
      keep.set(p.kind, left - 1);
    }
  }
  return out;
}

// ---- 決めたとき（グワッ）の付随する演出 ----

export type FxFlash = "warm" | "hush" | "lightning";
export type FxShell = "shake" | "sway" | "calm";

export type FxPlan = {
  /** 画面全体のやわらかい明るさ（1回だけ・点滅しない） */
  flash: FxFlash | null;
  /** flash を出すまでの待ち（嵐の稲光は 350ms 後） */
  flashDelayMs: number;
  /** 画面の揺れ・静止 */
  shell: FxShell | null;
  /** shell を付けるまでの待ち（凪は 1.5 秒後に止まる） */
  shellDelayMs: number;
  /** shell を外すまで（null は次の演出・画面移動まで付けたまま） */
  shellMs: number | null;
  vibrate: number | number[] | null;
  sound: SoundName | null;
};

const NO_PLAN: FxPlan = {
  flash: null,
  flashDelayMs: 0,
  shell: null,
  shellDelayMs: 0,
  shellMs: null,
  vibrate: null,
  sound: null,
};

/**
 * プロトタイプ startFx の「決めたとき」と同じ。うっすら（セット）と「動きをへらす」では何もしない（色の変化だけ）。
 * 音：追い風＝やさしい鈴、そよ風＝チャイム、凪＝無音、向かい風＝風、嵐＝突風。
 */
export function fxPlan(mood: MoodId, full: boolean, reducedMotion: boolean): FxPlan {
  if (!full || reducedMotion) return NO_PLAN;
  switch (mood) {
    case 0:
      return { ...NO_PLAN, flash: "warm", vibrate: [10, 30, 14, 30, 18], sound: "bell" };
    case 1:
      return { ...NO_PLAN, vibrate: 10, sound: "chime" };
    case 2:
      return { ...NO_PLAN, flash: "hush", shell: "calm", shellDelayMs: 1500 };
    case 3:
      return { ...NO_PLAN, shell: "sway", vibrate: [24, 30, 24], sound: "wind" };
    case 4:
      return {
        ...NO_PLAN,
        flash: "lightning",
        flashDelayMs: 350,
        shell: "shake",
        shellMs: 1700,
        vibrate: [30, 20, 30, 20, 60, 40, 30],
        sound: "gust",
      };
  }
}

/** 「グワッ」で花びらが飛び出す玉の位置（プロトタイプは 390×844 の (195, 300)。高さは画面に合わせる） */
export function beadOrigin(H: number): { x: number; y: number } {
  return { x: LOGICAL_WIDTH / 2, y: (H * 300) / 844 };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
