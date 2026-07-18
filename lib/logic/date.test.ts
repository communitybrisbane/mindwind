import { describe, expect, it } from "vitest";
import { formatDateHeading, greeting, tokyoDateKey, tokyoDayStart, tokyoHour } from "./date";

describe("formatDateHeading", () => {
  it("東京時間の月日と曜日を返す", () => {
    // 2026-07-14 は火曜日
    expect(formatDateHeading(new Date("2026-07-14T03:00:00+09:00"))).toBe("7月14日（火）");
  });

  it("UTC の日付ではなく東京の日付で表示する", () => {
    // UTC では 7/14 15:30 だが東京では 7/15 0:30
    expect(formatDateHeading(new Date("2026-07-14T15:30:00Z"))).toBe("7月15日（水）");
  });
});

describe("tokyoHour / greeting", () => {
  it("東京の時刻を返す", () => {
    expect(tokyoHour(new Date("2026-07-14T22:30:00Z"))).toBe(7); // 東京 7:30
    expect(tokyoHour(new Date("2026-07-14T15:00:00Z"))).toBe(0); // 東京 0:00
  });

  it("時間帯で挨拶を出し分ける", () => {
    expect(greeting(7)).toBe("おはようございます");
    expect(greeting(11)).toBe("こんにちは");
    expect(greeting(17)).toBe("こんにちは");
    expect(greeting(18)).toBe("おつかれさまです");
    expect(greeting(2)).toBe("おつかれさまです");
  });
});

describe("tokyoDateKey", () => {
  it("東京の日付キーを返す", () => {
    expect(tokyoDateKey(new Date("2026-07-14T03:00:00+09:00"))).toBe("2026-07-14");
  });

  it("東京0時をまたぐと日付が変わる", () => {
    expect(tokyoDateKey(new Date("2026-07-14T14:59:59Z"))).toBe("2026-07-14");
    expect(tokyoDateKey(new Date("2026-07-14T15:00:00Z"))).toBe("2026-07-15");
  });
});

describe("tokyoDayStart", () => {
  it("日付キーの東京0時（UTC 前日15時）を返す", () => {
    const start = tokyoDayStart("2026-07-18");
    expect(start.toISOString()).toBe("2026-07-17T15:00:00.000Z");
  });

  it("tokyoDateKey と往復して一致する（0時ちょうどはその日）", () => {
    expect(tokyoDateKey(tokyoDayStart("2026-07-18"))).toBe("2026-07-18");
  });
});
