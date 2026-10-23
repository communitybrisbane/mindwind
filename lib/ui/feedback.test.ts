import { describe, expect, it } from "vitest";
import { canVibrate, isAndroidUA, minInterval, sound, toneRecipe, unlockAudio, vibrate, windRecipe } from "./feedback";

describe("isAndroidUA", () => {
  it("Android だけ true", () => {
    expect(isAndroidUA("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120")).toBe(true);
    expect(isAndroidUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(false);
    expect(isAndroidUA("")).toBe(false);
    expect(isAndroidUA(undefined)).toBe(false);
  });
});

describe("canVibrate", () => {
  const ok = { pref: true, android: true, touched: true, supported: true };
  it("全部そろったときだけ", () => {
    expect(canVibrate(ok)).toBe(true);
    expect(canVibrate({ ...ok, pref: false })).toBe(false);
    expect(canVibrate({ ...ok, android: false })).toBe(false);
    expect(canVibrate({ ...ok, touched: false })).toBe(false);
    expect(canVibrate({ ...ok, supported: false })).toBe(false);
  });
});

describe("toneRecipe", () => {
  it("tick は2音で、高音は 1700〜2000Hz", () => {
    const lo = toneRecipe("tick", () => 0);
    const hi = toneRecipe("tick", () => 1);
    expect(lo).toHaveLength(2);
    expect(lo[0].freq).toBe(1700);
    expect(hi[0].freq).toBe(2000);
  });
  it("pon / seal / chime / pop / rub / bell は鳴る", () => {
    for (const n of ["pon", "seal", "chime", "pop", "rub", "bell"] as const) {
      expect(toneRecipe(n).length).toBeGreaterThan(0);
    }
    expect(toneRecipe("bell").map((t) => t.freq)).toEqual([523, 659, 784]);
  });
  it("wind / gust はノイズ側で、トーンは空", () => {
    expect(toneRecipe("wind")).toEqual([]);
    expect(toneRecipe("gust")).toEqual([]);
  });
});

describe("windRecipe", () => {
  it("嵐は向かい風より強く低い", () => {
    const w = windRecipe("wind");
    const g = windRecipe("gust");
    expect(g.peak).toBeGreaterThan(w.peak);
    expect(g.filterFreq).toBeLessThan(w.filterFreq);
    expect(g.tail).toBeLessThan(g.peak);
  });
});

describe("minInterval", () => {
  it("tick だけ間引く", () => {
    expect(minInterval("tick")).toBe(22);
    expect(minInterval("pon")).toBe(0);
  });
});

describe("SSR（window / navigator なし）", () => {
  it("何を呼んでも落ちない", () => {
    expect(() => {
      vibrate(10);
      sound("pon");
      unlockAudio();
    }).not.toThrow();
  });
});
