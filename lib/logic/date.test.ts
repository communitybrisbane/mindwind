import { describe, expect, it } from "vitest";
import { formatDateHeading, tokyoDateKey } from "./date";

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

describe("tokyoDateKey", () => {
  it("東京の日付キーを返す", () => {
    expect(tokyoDateKey(new Date("2026-07-14T03:00:00+09:00"))).toBe("2026-07-14");
  });

  it("東京0時をまたぐと日付が変わる", () => {
    expect(tokyoDateKey(new Date("2026-07-14T14:59:59Z"))).toBe("2026-07-14");
    expect(tokyoDateKey(new Date("2026-07-14T15:00:00Z"))).toBe("2026-07-15");
  });
});
