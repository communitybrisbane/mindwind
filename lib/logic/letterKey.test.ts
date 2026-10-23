import { describe, expect, it } from "vitest";
import { tokyoDateKey } from "./date";
import { hasEnoughForLetter, isLetterDay, isLetterOpenable, isWeekKey, letterDocId } from "./letterKey";
import { letterWeekFor, weekKeyFor } from "./week";

describe("isWeekKey", () => {
  it("月曜の実在日だけ true", () => {
    expect(isWeekKey("2026-10-19")).toBe(true);
    expect(isWeekKey("2026-10-20")).toBe(false);
    expect(isWeekKey("2026-02-30")).toBe(false);
    expect(isWeekKey("2026-1-19")).toBe(false);
    expect(isWeekKey(123)).toBe(false);
    expect(isWeekKey(undefined)).toBe(false);
  });
  it("letterDocId", () => {
    expect(letterDocId("2026-12-28")).toBe("2026-12-28");
    expect(letterDocId("../x")).toBeNull();
  });
});

describe("isLetterOpenable", () => {
  const w = "2026-10-19"; // 日曜は 10-25
  it("日曜〜翌土曜だけ開ける", () => {
    expect(isLetterOpenable(w, "2026-10-24")).toBe(false);
    expect(isLetterOpenable(w, "2026-10-25")).toBe(true);
    expect(isLetterOpenable(w, "2026-10-31")).toBe(true);
    expect(isLetterOpenable(w, "2026-11-01")).toBe(false);
  });
  it("letterWeekFor と整合（毎日、対象週は開ける）", () => {
    for (let d = 20; d <= 31; d++) {
      const today = `2026-12-${d}`;
      expect(isLetterOpenable(letterWeekFor(today), today)).toBe(true);
    }
    expect(isLetterOpenable(letterWeekFor("2027-01-02"), "2027-01-02")).toBe(true);
  });
  it("年またぎ", () => {
    expect(isLetterOpenable("2026-12-28", "2027-01-03")).toBe(true);
    expect(isLetterOpenable("2026-12-28", "2027-01-09")).toBe(true);
    expect(isLetterOpenable("2026-12-28", "2027-01-10")).toBe(false);
  });
});

describe("isLetterDay", () => {
  it("日曜のみ", () => {
    expect(isLetterDay("2026-10-25")).toBe(true);
    expect(isLetterDay("2026-10-26")).toBe(false);
  });
});

describe("hasEnoughForLetter", () => {
  it("3日以上", () => {
    expect(hasEnoughForLetter(2)).toBe(false);
    expect(hasEnoughForLetter(3)).toBe(true);
  });
});

describe("Asia/Tokyo の0時", () => {
  it("UTC 日曜 14:59 は東京で日曜、15:00 は月曜（週が替わる）", () => {
    const sun = tokyoDateKey(new Date("2026-10-25T14:59:59Z"));
    const mon = tokyoDateKey(new Date("2026-10-25T15:00:00Z"));
    expect(sun).toBe("2026-10-25");
    expect(mon).toBe("2026-10-26");
    expect(weekKeyFor(sun)).toBe("2026-10-19");
    expect(weekKeyFor(mon)).toBe("2026-10-26");
    expect(isLetterDay(sun)).toBe(true);
    expect(isLetterDay(mon)).toBe(false);
    expect(isLetterOpenable("2026-10-19", mon)).toBe(true);
  });
});
