import { describe, expect, it } from "vitest";
import { consultLimitFor, guestLimit, MEMBER_LIMITS, recordLimitFor } from "./limits";

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
