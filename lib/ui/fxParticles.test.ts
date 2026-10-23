import { describe, expect, it } from "vitest";
import {
  AMB_INITIAL,
  AMB_OPACITY,
  BASE_COUNT,
  HEADWIND_LEAVES,
  LOGICAL_WIDTH,
  STORM_STREAKS,
  adaptQuality,
  beadOrigin,
  burstAmount,
  dimAmbience,
  frameDt,
  fxPlan,
  initialQuality,
  makeParticles,
  nextAmbience,
  particleCount,
  residualOpacity,
  scatterFromBead,
  stepLeaf,
  stepPetal,
  stepRain,
  stepStreak,
  stormSoftness,
  strengthOf,
  trimParticles,
  visibleCount,
  visibleLeaves,
  type Leaf,
  type Petal,
  type Rain,
  type Streak,
} from "./fxParticles";

/** 決まった順に値を返す乱数（テスト用） */
function seq(...vals: number[]) {
  let i = 0;
  return () => vals[i++ % vals.length];
}
const half = () => 0.5;

describe("粒子の数", () => {
  it("凪は 0（無風）", () => {
    expect(particleCount(2)).toBe(0);
    const { parts, leaves } = makeParticles(2, 844, half);
    expect(parts).toHaveLength(0);
    expect(leaves).toHaveLength(0);
  });

  it("基本の数の2倍を作る。quality で減らし、下限 0.25", () => {
    expect(particleCount(0)).toBe(BASE_COUNT[0] * 2);
    expect(particleCount(4, 0.5)).toBe(BASE_COUNT[4]);
    expect(particleCount(4, 0)).toBe(Math.round(BASE_COUNT[4] * 2 * 0.25));
    expect(particleCount(1, 5)).toBe(BASE_COUNT[1] * 2);
  });

  it("追い風＝花びら、そよ風＝葉（どちらも petal）", () => {
    const a = makeParticles(0, 844, half).parts;
    expect(a.every((p) => p.kind === "petal")).toBe(true);
    const b = makeParticles(1, 844, half).parts;
    expect(b).toHaveLength(BASE_COUNT[1] * 2);
    expect(b.every((p) => p.kind === "petal")).toBe(true);
  });

  it("向かい風＝風の筋と葉", () => {
    const { parts, leaves } = makeParticles(3, 844, half);
    expect(parts).toHaveLength(BASE_COUNT[3] * 2);
    expect(parts.every((p) => p.kind === "streak")).toBe(true);
    expect(leaves).toHaveLength(HEADWIND_LEAVES);
  });

  it("嵐＝雨と風の筋", () => {
    const { parts, leaves } = makeParticles(4, 844, half);
    expect(parts.filter((p) => p.kind === "rain")).toHaveLength(BASE_COUNT[4] * 2);
    expect(parts.filter((p) => p.kind === "streak")).toHaveLength(STORM_STREAKS);
    expect(leaves).toHaveLength(0);
  });

  it("位置は画面の中（高さ H に合わせる）", () => {
    const { parts } = makeParticles(0, 600, seq(0, 1));
    for (const p of parts) {
      expect(p.x).toBeGreaterThanOrEqual(-20);
      expect(p.x).toBeLessThanOrEqual(LOGICAL_WIDTH);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });
});

describe("グワッ（玉から放射状に）", () => {
  it("最初の最大26粒を玉の位置に集め、外向きの速さを持たせる", () => {
    const { parts } = makeParticles(0, 844, half);
    scatterFromBead(parts, 195, 300, seq(0.25, 1));
    const flying = parts.filter((p) => p.kind === "petal" && p.bvx !== undefined) as Petal[];
    expect(flying).toHaveLength(26);
    for (const p of flying) {
      expect(p.x).toBe(195);
      expect(p.y).toBe(300);
    }
  });

  it("玉の位置は画面の高さに合わせる", () => {
    expect(beadOrigin(844)).toEqual({ x: 195, y: 300 });
    expect(beadOrigin(422).y).toBe(150);
  });
});

describe("強さ", () => {
  it("うっすら 0.34・グワッ 1", () => {
    expect(strengthOf(false)).toBe(0.34);
    expect(strengthOf(true)).toBe(1);
  });

  it("決定の瞬間だけ強く、0.9 秒で 0 になる。セットは 0", () => {
    expect(burstAmount(true, 0)).toBe(1);
    expect(burstAmount(true, 0.45)).toBeCloseTo(0.5);
    expect(burstAmount(true, 2)).toBe(0);
    expect(burstAmount(false, 0)).toBe(0);
  });

  it("うっすらは粒が少なく、グワッの瞬間は全部描く", () => {
    expect(visibleCount(100, 0.34, 0)).toBe(17);
    expect(visibleCount(100, 1, 0)).toBe(50);
    expect(visibleCount(100, 1, 1)).toBe(100);
    expect(visibleLeaves(16, 0.34, 0)).toBe(5);
    expect(visibleLeaves(16, 1, 0)).toBe(16);
  });

  it("嵐は約3秒で弱まり、0.28 で止まる（セットは弱めのまま一定）", () => {
    expect(stormSoftness(true, 0)).toBe(1);
    expect(stormSoftness(true, 3.1)).toBe(1);
    expect(stormSoftness(true, 4.5)).toBeCloseTo(0.5);
    expect(stormSoftness(true, 20)).toBe(0.28);
    expect(stormSoftness(false, 20)).toBe(1);
  });

  it("1フレームの経過秒は 0.05 秒で頭打ち", () => {
    expect(frameDt(1016, 1000)).toBeCloseTo(0.016);
    expect(frameDt(5000, 1000)).toBe(0.05);
    expect(frameDt(1000, 1000)).toBe(0.001);
  });
});

describe("1フレームの移動", () => {
  it("花びらは右へ流れ、右端を越えると左から戻る", () => {
    const p: Petal = { kind: "petal", x: 409, y: 100, vx: 100, vy: 0, s: 4, r: 0, vr: 0, f: 1, ph: 0, sw: 0, c: "" };
    stepPetal(p, 0.05, 0, 844, half);
    expect(p.x).toBe(-18);
    expect(p.y).toBeCloseTo(844 * 0.83 * 0.5);
  });

  it("飛び出した速さは減って、やがて消える", () => {
    const p: Petal = {
      kind: "petal", x: 195, y: 300, vx: 0, vy: 0, s: 4, r: 0, vr: 0, f: 1, ph: 0, sw: 0, c: "",
      bvx: 300, bvy: 0,
    };
    for (let i = 0; i < 100; i++) stepPetal(p, 0.05, 0, 844, half);
    expect(p.bvx).toBeUndefined();
    expect(p.x).toBeGreaterThan(195);
  });

  it("風の筋は左へ流れ、左端を出ると右から戻る（突風で速く）", () => {
    const p: Streak = { kind: "streak", x: 10, y: 50, v: 500, l: 20, a: 0.3 };
    stepStreak(p, 0.05, 844, 2, 120, half);
    expect(p.x).toBe(LOGICAL_WIDTH + 60);
    expect(p.y).toBe(422);
  });

  it("雨は下に落ち、画面の下を出ると上から降る", () => {
    const p: Rain = { kind: "rain", x: 200, y: 850, vx: -300, vy: 1000, a: 0.3 };
    stepRain(p, 0.05, 844, half);
    expect(p.y).toBeLessThan(0);
  });

  it("葉は左へ飛ばされ、左端を出ると右から戻る", () => {
    const p: Leaf = { kind: "leaf", x: -11, y: 100, v: 300, s: 4, r: 0, vr: 1 };
    stepLeaf(p, 0.05, 0, 844, 1, half);
    expect(p.x).toBe(LOGICAL_WIDTH + 20);
  });
});

describe("重い端末", () => {
  it("コア数・メモリが少ない端末は最初から減らす", () => {
    expect(initialQuality({ cores: 8, memoryGb: 8 })).toBe(1);
    expect(initialQuality({ cores: 4 })).toBe(0.6);
    expect(initialQuality({ cores: 8, memoryGb: 2 })).toBe(0.5);
    expect(initialQuality({})).toBe(1);
  });

  it("フレームが重ければ下げる（上げない・下限 0.25）", () => {
    expect(adaptQuality(1, 16)).toBe(1);
    expect(adaptQuality(1, 40)).toBe(0.7);
    expect(adaptQuality(0.3, 40)).toBe(0.25);
  });

  it("減らすときは種類ごとの割合を保つ", () => {
    const parts = [
      ...Array.from({ length: 10 }, () => ({ kind: "rain" })),
      ...Array.from({ length: 4 }, () => ({ kind: "streak" })),
    ];
    const out = trimParticles(parts, 0.5);
    expect(out.filter((p) => p.kind === "rain")).toHaveLength(5);
    expect(out.filter((p) => p.kind === "streak")).toHaveLength(2);
    expect(trimParticles(parts, 1)).toBe(parts);
  });
});

describe("背景の色（2枚重ね）", () => {
  it("最初の色はもう一方の板に出す", () => {
    const s = nextAmbience(AMB_INITIAL, 0, AMB_OPACITY.preview);
    expect(s.cur).toBe(1);
    expect(s.layers[1]).toEqual({ mood: 0, opacity: 0.62, burstKey: 0 });
    expect(s.layers[0].opacity).toBe(0);
  });

  it("同じ風なら濃さだけ変える（板は入れ替えない）", () => {
    const a = nextAmbience(AMB_INITIAL, 3, 0.62);
    const b = nextAmbience(a, 3, 0.4);
    expect(b.cur).toBe(a.cur);
    expect(b.layers[b.cur].opacity).toBe(0.4);
  });

  it("違う風に変わると板を入れ替え、前の板は色を残したまま消えていく", () => {
    const a = nextAmbience(AMB_INITIAL, 0, 0.62);
    const b = nextAmbience(a, 4, 0.62);
    expect(b.cur).not.toBe(a.cur);
    expect(b.layers[b.cur].mood).toBe(4);
    expect(b.layers[a.cur]).toEqual({ mood: 0, opacity: 0, burstKey: 0 });
  });

  it("グワッは同じ風でも入れ替えて、弾む合図（burstKey）を進める", () => {
    const a = nextAmbience(AMB_INITIAL, 1, 0.62);
    const b = nextAmbience(a, 1, 1, true);
    expect(b.cur).not.toBe(a.cur);
    expect(b.layers[b.cur]).toEqual({ mood: 1, opacity: 1, burstKey: 1 });
  });

  it("null で両方を消す", () => {
    const a = nextAmbience(AMB_INITIAL, 2, 1, true);
    const b = nextAmbience(a, null, 0);
    expect(b.layers.every((l) => l.opacity === 0)).toBe(true);
  });

  it("回している間は 0.22 まで静める（出ていなければそのまま）", () => {
    expect(dimAmbience(AMB_INITIAL)).toBe(AMB_INITIAL);
    const a = nextAmbience(AMB_INITIAL, 0, 1, true);
    expect(dimAmbience(a).layers[a.cur].opacity).toBe(AMB_OPACITY.spin);
  });

  it("1日の残り香は暗い風ほど薄い", () => {
    expect(residualOpacity(0)).toBe(AMB_OPACITY.residual);
    expect(residualOpacity(4)).toBeLessThan(residualOpacity(2));
    expect(residualOpacity(2)).toBeLessThan(residualOpacity(1));
  });
});

describe("決めたときの付随の演出", () => {
  it("うっすら・動きをへらすでは何もしない（色の変化だけ）", () => {
    for (const m of [0, 1, 2, 3, 4] as const) {
      expect(fxPlan(m, false, false)).toMatchObject({ flash: null, shell: null, vibrate: null, sound: null });
      expect(fxPlan(m, true, true)).toMatchObject({ flash: null, shell: null, vibrate: null, sound: null });
    }
  });

  it("追い風＝あたたかい光と鈴", () => {
    expect(fxPlan(0, true, false)).toMatchObject({ flash: "warm", sound: "bell" });
  });

  it("凪＝無音で、1.5 秒後に動きを止める", () => {
    const p = fxPlan(2, true, false);
    expect(p).toMatchObject({ flash: "hush", shell: "calm", shellDelayMs: 1500, sound: null, vibrate: null });
  });

  it("向かい風＝揺れと風の音", () => {
    expect(fxPlan(3, true, false)).toMatchObject({ shell: "sway", sound: "wind" });
  });

  it("嵐＝稲光は1回だけ少し遅れて、揺れは 1.7 秒で止まる", () => {
    expect(fxPlan(4, true, false)).toMatchObject({
      flash: "lightning",
      flashDelayMs: 350,
      shell: "shake",
      shellMs: 1700,
      sound: "gust",
    });
  });
});
