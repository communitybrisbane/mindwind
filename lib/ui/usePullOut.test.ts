import { describe, expect, it } from "vitest";
import {
  PULL_MAX,
  PULL_REST,
  PULL_THRESHOLD,
  hasMoved,
  pullDecision,
  pullDistance,
  pullTick,
  pullTranslate,
} from "./usePullOut";

describe("pullDistance", () => {
  it("上へ動かした量を返す", () => {
    expect(pullDistance(500, 400)).toBe(100);
  });
  it("下へ動かしたら 0", () => {
    expect(pullDistance(400, 450)).toBe(0);
  });
  it("最大で PULL_MAX に止まる", () => {
    expect(pullDistance(1000, 0)).toBe(PULL_MAX);
  });
  it("拡大率で割る", () => {
    expect(pullDistance(500, 300, 2)).toBe(100);
  });
  it("拡大率が 0 以下なら 1 とみなす", () => {
    expect(pullDistance(500, 300, 0)).toBe(200);
  });
  it("NaN は 0", () => {
    expect(pullDistance(Number.NaN, 0)).toBe(0);
  });
});

describe("hasMoved", () => {
  it("5px 以下はタップ扱い", () => {
    expect(hasMoved(0)).toBe(false);
    expect(hasMoved(5)).toBe(false);
    expect(hasMoved(5.1)).toBe(true);
  });
});

describe("pullDecision", () => {
  it("タップ（動かしていない）なら出る", () => {
    expect(pullDecision(0, false)).toBe("out");
  });
  it("閾値を超えて離すと出る", () => {
    expect(pullDecision(PULL_THRESHOLD + 1, true)).toBe("out");
  });
  it("閾値ちょうど以下なら戻る", () => {
    expect(pullDecision(PULL_THRESHOLD, true)).toBe("back");
    expect(pullDecision(40, true)).toBe("back");
  });
});

describe("pullTick / pullTranslate", () => {
  it("28px ごとに段が変わる", () => {
    expect(pullTick(0)).toBe(0);
    expect(pullTick(27)).toBe(0);
    expect(pullTick(28)).toBe(1);
    expect(pullTick(-10)).toBe(0);
  });
  it("顔を出した量に引いた量を足して上へ", () => {
    expect(pullTranslate(0)).toBe(-PULL_REST);
    expect(pullTranslate(100)).toBe(-(PULL_REST + 100));
    expect(pullTranslate(-5)).toBe(-PULL_REST);
  });
});
