import { describe, expect, it } from "vitest";
import {
  consultLimitFor,
  deepdiveLimitFor,
  guestLimit,
  letterLimitFor,
  LIMIT_WARN_RATIO,
  MAX_NICKNAME_LENGTH,
  MAX_QUICK_LENGTH,
  MIN_QUICK_LENGTH,
  warnAtFor,
  MEMBER_LIMITS,
  recordLimitFor,
  shapeLimitFor,
} from "./limits";

describe("guestLimit", () => {
  it("会員上限の 1/10（切り捨て）", () => {
    expect(guestLimit(30)).toBe(3);
    expect(guestLimit(100)).toBe(10);
  });

  it("最低1は保証する", () => {
    expect(guestLimit(3)).toBe(1);
    expect(guestLimit(9)).toBe(1);
  });
});

describe("consultLimitFor / recordLimitFor", () => {
  it("相談：会員は満額・ゲストは 1/10", () => {
    expect(consultLimitFor(false)).toBe(MEMBER_LIMITS.consultPerDay);
    expect(consultLimitFor(true)).toBe(guestLimit(MEMBER_LIMITS.consultPerDay));
  });

  it("記録：会員は満額・ゲストは 1/10", () => {
    expect(recordLimitFor(false)).toBe(MEMBER_LIMITS.recordPerDay);
    expect(recordLimitFor(true)).toBe(guestLimit(MEMBER_LIMITS.recordPerDay));
  });

  it("現在の値：会員30・ゲスト3", () => {
    expect(recordLimitFor(false)).toBe(30);
    expect(recordLimitFor(true)).toBe(3);
  });
});

describe("deepdiveLimitFor / shapeLimitFor", () => {
  it("会員は満額・ゲストは 1/10", () => {
    expect(deepdiveLimitFor(false)).toBe(MEMBER_LIMITS.deepdivePerDay);
    expect(deepdiveLimitFor(true)).toBe(guestLimit(MEMBER_LIMITS.deepdivePerDay));
    expect(shapeLimitFor(false)).toBe(MEMBER_LIMITS.shapePerDay);
    expect(shapeLimitFor(true)).toBe(guestLimit(MEMBER_LIMITS.shapePerDay));
  });

  it("現在の値：会員90・ゲスト9（記録上限の3倍）", () => {
    expect(deepdiveLimitFor(false)).toBe(90);
    expect(shapeLimitFor(true)).toBe(9);
    expect(MEMBER_LIMITS.deepdivePerDay).toBe(MEMBER_LIMITS.recordPerDay * 3);
  });
});

describe("新しい定数", () => {
  it("契約どおりの値", () => {
    expect(MAX_QUICK_LENGTH).toBe(60);
    expect(MIN_QUICK_LENGTH).toBe(2);
    expect(MAX_NICKNAME_LENGTH).toBe(12);
    expect(LIMIT_WARN_RATIO).toBe(0.9);
  });

  it("手紙：会員3・ゲスト1", () => {
    expect(letterLimitFor(false)).toBe(3);
    expect(letterLimitFor(true)).toBe(1);
  });

  it("warnAtFor は上限の約9割（切り上げ）", () => {
    expect(warnAtFor(60)).toBe(54);
    expect(warnAtFor(5000)).toBe(4500);
    expect(warnAtFor(2000)).toBe(1800);
    expect(warnAtFor(12)).toBe(11);
  });
});
