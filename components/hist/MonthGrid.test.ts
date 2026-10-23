import { describe, expect, it } from "vitest";
import { canGoNext, initialView, shiftView, viewRange, viewTitle } from "./MonthGrid";

describe("風の記録の表示状態", () => {
  const today = "2026-10-25";

  it("開いたときは今日の月", () => {
    expect(initialView(today)).toEqual({ mode: "month", year: 2026, month: 10 });
  });

  it("月の範囲：今月は今日まで・過去の月は月末まで・未来は null", () => {
    expect(viewRange({ mode: "month", year: 2026, month: 10 }, today)).toEqual({ from: "2026-10-01", to: "2026-10-25" });
    expect(viewRange({ mode: "month", year: 2026, month: 9 }, today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(viewRange({ mode: "month", year: 2024, month: 2 }, today)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(viewRange({ mode: "month", year: 2026, month: 11 }, today)).toBeNull();
  });

  it("年の範囲：今年は今日まで・去年は12/31まで・来年は null", () => {
    expect(viewRange({ mode: "year", year: 2026, month: 10 }, today)).toEqual({ from: "2026-01-01", to: "2026-10-25" });
    expect(viewRange({ mode: "year", year: 2025, month: 10 }, today)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(viewRange({ mode: "year", year: 2027, month: 1 }, today)).toBeNull();
  });

  it("前へ・次へは年をまたぐ", () => {
    expect(shiftView({ mode: "month", year: 2026, month: 1 }, -1)).toEqual({ mode: "month", year: 2025, month: 12 });
    expect(shiftView({ mode: "month", year: 2025, month: 12 }, 1)).toEqual({ mode: "month", year: 2026, month: 1 });
    expect(shiftView({ mode: "year", year: 2026, month: 5 }, -1)).toEqual({ mode: "year", year: 2025, month: 5 });
  });

  it("今日の月・年より先へは進めない", () => {
    expect(canGoNext({ mode: "month", year: 2026, month: 10 }, today)).toBe(false);
    expect(canGoNext({ mode: "month", year: 2026, month: 9 }, today)).toBe(true);
    expect(canGoNext({ mode: "month", year: 2025, month: 12 }, today)).toBe(true);
    expect(canGoNext({ mode: "year", year: 2026, month: 1 }, today)).toBe(false);
    expect(canGoNext({ mode: "year", year: 2025, month: 1 }, today)).toBe(true);
  });

  it("見出し", () => {
    expect(viewTitle({ mode: "month", year: 2026, month: 10 })).toBe("2026年10月");
    expect(viewTitle({ mode: "year", year: 2026, month: 10 })).toBe("2026年");
  });
});
