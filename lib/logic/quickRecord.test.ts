import { describe, expect, it } from "vitest";
import { charLength, quickMeta, toMood, validateQuickText } from "./quickRecord";

describe("validateQuickText", () => {
  it("trim して 2〜60 文字なら ok", () => {
    expect(validateQuickText("  いい日  ")).toEqual({ ok: true, text: "いい日" });
    expect(validateQuickText("ok")).toEqual({ ok: true, text: "ok" });
    expect(validateQuickText("あ".repeat(60))).toEqual({ ok: true, text: "あ".repeat(60) });
  });

  it("空・1文字は too_short", () => {
    expect(validateQuickText("")).toEqual({ ok: false, error: "too_short" });
    expect(validateQuickText("   ")).toEqual({ ok: false, error: "too_short" });
    expect(validateQuickText(" あ ")).toEqual({ ok: false, error: "too_short" });
  });

  it("61文字は too_long", () => {
    expect(validateQuickText("あ".repeat(61))).toEqual({ ok: false, error: "too_long" });
  });

  it("絵文字は1文字と数える", () => {
    expect(charLength("😀😀")).toBe(2);
    expect(validateQuickText("😀".repeat(60)).ok).toBe(true);
  });
});

describe("toMood / quickMeta", () => {
  it("0〜4 だけ受け付ける", () => {
    expect(toMood(3)).toBe(3);
    expect(toMood(5)).toBeUndefined();
    expect(toMood("1")).toBeUndefined();
    expect(toMood(undefined)).toBeUndefined();
  });

  it("気分があれば固定の一行、なければ付けない", () => {
    expect(quickMeta(3)).toBe("気分：向かい風（つらい日）");
    expect(quickMeta(undefined)).toBeUndefined();
  });
});
