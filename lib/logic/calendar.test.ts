import { describe, expect, it } from "vitest";
import { buildDateKey, monthGrid, parseYearMonth, shiftMonth } from "./calendar";

describe("monthGrid", () => {
  it("2026年7月は水曜始まりで31日ある", () => {
    const weeks = monthGrid(2026, 7);
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(weeks.at(-1)).toEqual([26, 27, 28, 29, 30, 31, null]);
    expect(weeks.flat().filter((d) => d !== null)).toHaveLength(31);
  });

  it("うるう年の2月", () => {
    const days = monthGrid(2028, 2).flat().filter((d) => d !== null);
    expect(days).toHaveLength(29);
  });
});

describe("shiftMonth", () => {
  it("年をまたいで前後できる", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 7, 0)).toEqual({ year: 2026, month: 7 });
  });
});

describe("buildDateKey / parseYearMonth", () => {
  it("tokyoDateKey と同じ形式のキーを作る", () => {
    expect(buildDateKey(2026, 7, 5)).toBe("2026-07-05");
    expect(parseYearMonth("2026-07-15")).toEqual({ year: 2026, month: 7 });
  });
});
