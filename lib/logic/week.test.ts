import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, letterWeekFor, weekDates, weekKeyFor, weekRange } from "./week";

describe("weekKeyFor", () => {
  it("月曜はそのまま、日曜は6日前の月曜", () => {
    expect(weekKeyFor("2026-10-19")).toBe("2026-10-19");
    expect(weekKeyFor("2026-10-25")).toBe("2026-10-19");
    expect(weekKeyFor("2026-10-26")).toBe("2026-10-26");
  });
  it("年またぎ", () => {
    expect(weekKeyFor("2027-01-01")).toBe("2026-12-28");
    expect(weekKeyFor("2026-01-01")).toBe("2025-12-29");
  });
  it("うるう日", () => {
    expect(weekKeyFor("2028-03-01")).toBe("2028-02-28");
  });
});

describe("weekRange / weekDates", () => {
  it("月〜日", () => {
    expect(weekRange("2026-12-28")).toEqual({ from: "2026-12-28", to: "2027-01-03" });
    const d = weekDates("2026-12-28");
    expect(d).toHaveLength(7);
    expect(d[0]).toBe("2026-12-28");
    expect(d[4]).toBe("2027-01-01");
    expect(d[6]).toBe("2027-01-03");
  });
});

describe("letterWeekFor", () => {
  it("日曜はその週", () => {
    expect(letterWeekFor("2026-10-25")).toBe("2026-10-19");
  });
  it("月〜土は前の週", () => {
    expect(letterWeekFor("2026-10-26")).toBe("2026-10-19");
    expect(letterWeekFor("2026-10-31")).toBe("2026-10-19");
    expect(letterWeekFor("2026-10-24")).toBe("2026-10-12");
  });
  it("年またぎ", () => {
    expect(letterWeekFor("2027-01-03")).toBe("2026-12-28");
    expect(letterWeekFor("2027-01-04")).toBe("2026-12-28");
    expect(letterWeekFor("2027-01-01")).toBe("2026-12-21");
  });
});

describe("addDays / dayOfWeek", () => {
  it("日付の足し引き", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(dayOfWeek("2026-10-25")).toBe(0);
  });
});
