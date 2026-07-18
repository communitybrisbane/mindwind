import { describe, expect, it } from "vitest";
import { resolveRecordDate } from "./backdate";

const TODAY = "2026-07-18";

describe("resolveRecordDate", () => {
  it("未指定・空文字は今日になる", () => {
    expect(resolveRecordDate(undefined, TODAY)).toEqual({ ok: true, date: TODAY, isPast: false });
    expect(resolveRecordDate(null, TODAY)).toEqual({ ok: true, date: TODAY, isPast: false });
    expect(resolveRecordDate("", TODAY)).toEqual({ ok: true, date: TODAY, isPast: false });
  });

  it("今日を明示指定してもよい（isPast: false）", () => {
    expect(resolveRecordDate(TODAY, TODAY)).toEqual({ ok: true, date: TODAY, isPast: false });
  });

  it("過去日は isPast: true", () => {
    expect(resolveRecordDate("2026-07-10", TODAY)).toEqual({
      ok: true,
      date: "2026-07-10",
      isPast: true,
    });
    expect(resolveRecordDate("2020-01-01", TODAY)).toEqual({
      ok: true,
      date: "2020-01-01",
      isPast: true,
    });
  });

  it("未来日は拒否する", () => {
    expect(resolveRecordDate("2026-07-19", TODAY)).toEqual({ ok: false, reason: "future" });
    expect(resolveRecordDate("2030-01-01", TODAY)).toEqual({ ok: false, reason: "future" });
  });

  it("形式が不正なら拒否する", () => {
    expect(resolveRecordDate("2026/07/10", TODAY)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveRecordDate("2026-7-10", TODAY)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveRecordDate("20260710", TODAY)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveRecordDate(20260710, TODAY)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveRecordDate({}, TODAY)).toEqual({ ok: false, reason: "invalid" });
  });

  it("実在しない日付は拒否する", () => {
    expect(resolveRecordDate("2026-02-30", TODAY)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveRecordDate("2026-13-01", TODAY)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveRecordDate("2025-02-29", TODAY)).toEqual({ ok: false, reason: "invalid" });
  });

  it("うるう年の 2/29 は実在するので通る", () => {
    expect(resolveRecordDate("2024-02-29", TODAY)).toEqual({
      ok: true,
      date: "2024-02-29",
      isPast: true,
    });
  });
});
