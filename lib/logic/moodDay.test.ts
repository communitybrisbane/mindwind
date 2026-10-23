import { describe, expect, it } from "vitest";
import {
  addDays,
  isDateKey,
  isFirstLaunchOfDay,
  mondayOf,
  monthMatrix,
  recordedDays,
  sanitizeMoodMap,
  todayKeyOf,
  validateRange,
  weekStrip,
  yearMatrix,
} from "./moodDay";

describe("sanitizeMoodMap", () => {
  it("有効な行だけ残す", () => {
    expect(
      sanitizeMoodMap({ "2026-10-01": 0, "2026-10-02": 5, "2026-02-30": 1, x: 2, "2026-10-03": "1", "2026-10-04": 4 })
    ).toEqual({ "2026-10-01": 0, "2026-10-04": 4 });
  });
  it("オブジェクト以外は空", () => {
    expect(sanitizeMoodMap(null)).toEqual({});
    expect(sanitizeMoodMap([1])).toEqual({});
  });
});

describe("isFirstLaunchOfDay / todayKeyOf", () => {
  it("未表示・前日なら最初", () => {
    expect(isFirstLaunchOfDay(null, "2026-10-25")).toBe(true);
    expect(isFirstLaunchOfDay("2026-10-24", "2026-10-25")).toBe(true);
    expect(isFirstLaunchOfDay("2026-10-25", "2026-10-25")).toBe(false);
  });
  it("Asia/Tokyo の日付境界", () => {
    expect(todayKeyOf(new Date("2026-10-24T14:59:59Z"))).toBe("2026-10-24");
    expect(todayKeyOf(new Date("2026-10-24T15:00:00Z"))).toBe("2026-10-25");
  });
});

describe("recordedDays", () => {
  it("玉だけの日も数える", () => {
    expect([...recordedDays(["2026-10-01"], ["2026-10-01", "2026-10-02"])].sort()).toEqual(["2026-10-01", "2026-10-02"]);
  });
});

describe("日付計算", () => {
  it("isDateKey", () => {
    expect(isDateKey("2024-02-29")).toBe(true);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-1-1")).toBe(false);
  });
  it("addDays は月・年をまたぐ", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("mondayOf", () => {
    expect(mondayOf("2026-10-25")).toBe("2026-10-19"); // 日曜
    expect(mondayOf("2026-10-19")).toBe("2026-10-19"); // 月曜
    expect(mondayOf("2026-10-24")).toBe("2026-10-19"); // 土曜
  });
});

describe("weekStrip", () => {
  it("月曜はじまり7日・未来は null", () => {
    const w = weekStrip("2026-10-21", { "2026-10-19": 1, "2026-10-21": 3, "2026-10-23": 0 });
    expect(w.map((c) => c.date)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
    expect(w.map((c) => c.mood)).toEqual([1, null, 3, null, null, null, null]);
    expect(w[2].isToday).toBe(true);
    expect(w[3].isFuture).toBe(true);
  });
  it("日曜が今日なら7日目", () => {
    const w = weekStrip("2026-10-25", {});
    expect(w[0].date).toBe("2026-10-19");
    expect(w[6].isToday).toBe(true);
  });
});

describe("monthMatrix", () => {
  it("2026年10月（1日は木曜）", () => {
    const m = monthMatrix(2026, 10);
    expect(m.every((r) => r.length === 7)).toBe(true);
    expect(m[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(m.flat().filter(Boolean)).toHaveLength(31);
    expect(m).toHaveLength(5);
  });
  it("2026年2月（1日は日曜）は5行", () => {
    const m = monthMatrix(2026, 2);
    expect(m).toHaveLength(5);
    expect(m[0][6]).toBe("2026-02-01");
  });
  it("うるう年", () => {
    expect(monthMatrix(2024, 2).flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("yearMatrix", () => {
  it("12行×31列・存在しない日は null", () => {
    const y = yearMatrix(2026);
    expect(y).toHaveLength(12);
    expect(y.every((r) => r.length === 31)).toBe(true);
    expect(y[1].filter(Boolean)).toHaveLength(28);
    expect(y[1][28]).toBeNull();
    expect(y[0][30]).toBe("2026-01-31");
    expect(y.flat().filter(Boolean)).toHaveLength(365);
    expect(yearMatrix(2024).flat().filter(Boolean)).toHaveLength(366);
  });
});

describe("validateRange", () => {
  const today = "2026-10-24";
  it("正常", () => {
    expect(validateRange("2026-10-01", "2026-10-24", today)).toEqual({ ok: true, from: "2026-10-01", to: "2026-10-24" });
  });
  it("to が未来なら today に丸める", () => {
    expect(validateRange("2026-10-01", "2026-12-31", today)).toEqual({ ok: true, from: "2026-10-01", to: today });
  });
  it("from が未来なら不正", () => {
    expect(validateRange("2026-11-01", "2026-11-05", today)).toEqual({ ok: false });
  });
  it("形式・順序の不正", () => {
    expect(validateRange("2026-10-05", "2026-10-01", today)).toEqual({ ok: false });
    expect(validateRange("abc", "2026-10-01", today)).toEqual({ ok: false });
    expect(validateRange(undefined, undefined, today)).toEqual({ ok: false });
  });
  it("最大 366 日", () => {
    expect(validateRange("2025-10-24", "2026-10-24", today).ok).toBe(true); // 366日
    expect(validateRange("2025-10-23", "2026-10-24", today).ok).toBe(false); // 367日
  });
});
