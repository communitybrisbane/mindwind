import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, getPreferences, parsePreferences, samePreferences, subscribePreferences } from "./preferences";

describe("parsePreferences", () => {
  it("空・壊れた値は既定値", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("{oops")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("123")).toEqual(DEFAULT_PREFERENCES);
  });
  it("既定は 音オフ・振動オン・動きそのまま", () => {
    expect(DEFAULT_PREFERENCES).toEqual({ sound: false, vibrate: true, reduceMotion: false });
  });
  it("欠けた項目は既定で埋め、型違いは捨てる", () => {
    expect(parsePreferences('{"sound":true}')).toEqual({ sound: true, vibrate: true, reduceMotion: false });
    expect(parsePreferences('{"vibrate":"no","reduceMotion":true}')).toEqual({
      sound: false, vibrate: true, reduceMotion: true,
    });
  });
});

describe("samePreferences / SSR", () => {
  it("比較", () => {
    expect(samePreferences(DEFAULT_PREFERENCES, { ...DEFAULT_PREFERENCES })).toBe(true);
    expect(samePreferences(DEFAULT_PREFERENCES, { ...DEFAULT_PREFERENCES, sound: true })).toBe(false);
  });
  it("window が無くても既定値を返し、購読を解除できる", () => {
    expect(getPreferences()).toBe(DEFAULT_PREFERENCES);
    const off = subscribePreferences(() => {});
    expect(() => off()).not.toThrow();
  });
});
