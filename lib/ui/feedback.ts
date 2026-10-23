// 振動（Android のみ・最初のタップ後）と音（既定オフ・WebAudio）。SSR でも落ちない。
import { getPreferences } from "./preferences";

export type SoundName = "tick" | "pon" | "seal" | "chime" | "pop" | "rub" | "bell" | "wind" | "gust";

// ---- 純粋な部分（テスト対象） ----

export function isAndroidUA(ua: string | undefined | null): boolean {
  return !!ua && /android/i.test(ua);
}

export function canVibrate(o: {
  pref: boolean;
  android: boolean;
  touched: boolean;
  supported: boolean;
}): boolean {
  return o.pref && o.android && o.touched && o.supported;
}

export type Tone = {
  freq: number;
  dur: number;
  type: OscillatorType;
  vol: number;
  /** 鳴らし始めまでの遅れ（秒） */
  delay?: number;
  /** 後半で落とす周波数の割合（既定 0.5） */
  fall?: number;
};

/** 音ごとのトーン。プロトタイプ ui-v5.html の snd と同じ値。tick は呼び出しごとに高音を少しゆらす。 */
export function toneRecipe(name: SoundName, rand: () => number = Math.random): Tone[] {
  switch (name) {
    case "tick":
      return [
        { freq: 1700 + rand() * 300, dur: 0.025, type: "square", vol: 0.045 },
        { freq: 210, dur: 0.05, type: "triangle", vol: 0.09 },
      ];
    case "pon":
      return [{ freq: 220, dur: 0.18, type: "sine", vol: 0.3 }];
    case "seal":
      return [
        { freq: 150, dur: 0.22, type: "sine", vol: 0.35 },
        { freq: 520, dur: 0.1, type: "triangle", vol: 0.08, delay: 0.02 },
      ];
    case "chime":
      return [
        { freq: 660, dur: 0.5, type: "sine", vol: 0.1 },
        { freq: 880, dur: 0.6, type: "sine", vol: 0.08, delay: 0.12 },
      ];
    case "pop":
      return [{ freq: 520, dur: 0.1, type: "triangle", vol: 0.08 }];
    case "rub":
      return [{ freq: 180, dur: 0.08, type: "triangle", vol: 0.07 }];
    case "bell": // 追い風の鈴
      return [
        { freq: 523, dur: 0.5, type: "sine", vol: 0.08 },
        { freq: 659, dur: 0.5, type: "sine", vol: 0.07, delay: 0.12 },
        { freq: 784, dur: 0.7, type: "sine", vol: 0.07, delay: 0.24 },
      ];
    default:
      return []; // wind / gust はノイズ（windRecipe）
  }
}

export type WindRecipe = { power: number; filterFreq: number; peak: number; tail: number; total: number };

/** 風の音。wind=向かい風（弱め）、gust=嵐（強め・低め）。 */
export function windRecipe(name: "wind" | "gust"): WindRecipe {
  const power = name === "gust" ? 1 : 0.45;
  return {
    power,
    filterFreq: power > 0.6 ? 420 : 700,
    peak: 0.14 * power,
    tail: 0.05 * power,
    total: 4.2,
  };
}

/** 連打を間引く最小間隔（ms）。tick だけ 22ms。 */
export function minInterval(name: SoundName): number {
  return name === "tick" ? 22 : 0;
}

// ---- ブラウザ側 ----

let touched = false;
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
const lastPlayed: Partial<Record<SoundName, number>> = {};

function getCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** 最初の pointerdown で呼ぶ。触れた印を付け、AudioContext をこのタップの中で作る。 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  touched = true;
  try {
    const Ctor = getCtor();
    if (Ctor && !ctx) ctx = new Ctor();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  } catch {
    // 音が使えない環境では黙る
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const ok = canVibrate({
    pref: getPreferences().vibrate,
    android: isAndroidUA(navigator.userAgent),
    touched,
    supported: typeof navigator.vibrate === "function",
  });
  if (!ok) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // 無視
  }
}

function playTone(c: AudioContext, t: Tone) {
  const t0 = c.currentTime + (t.delay ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = t.type;
  o.frequency.setValueAtTime(t.freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, t.freq * (t.fall ?? 0.5)), t0 + t.dur);
  g.gain.setValueAtTime(t.vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + t.dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + t.dur + 0.02);
}

function playWind(c: AudioContext, name: "wind" | "gust") {
  const r = windRecipe(name);
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = r.filterFreq;
  f.Q.value = 0.7;
  const g = c.createGain();
  const t0 = c.currentTime;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(r.peak, t0 + 0.5);
  g.gain.linearRampToValueAtTime(r.tail, t0 + 2.6);
  g.gain.linearRampToValueAtTime(0, t0 + r.total);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + r.total + 0.1);
}

export function sound(name: SoundName): void {
  if (typeof window === "undefined") return;
  if (!getPreferences().sound) return;
  if (!touched) return; // 最初のタップより前は鳴らさない（自動再生ブロック対策）
  const now = performance.now();
  const gap = minInterval(name);
  if (gap && now - (lastPlayed[name] ?? -Infinity) < gap) return;
  lastPlayed[name] = now;
  try {
    const Ctor = getCtor();
    if (!ctx && Ctor) ctx = new Ctor();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    if (name === "wind" || name === "gust") playWind(ctx, name);
    else toneRecipe(name).forEach((t) => playTone(ctx!, t));
  } catch {
    // 音が出せなくても画面は止めない
  }
}
