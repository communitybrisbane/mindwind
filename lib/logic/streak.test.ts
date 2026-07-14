import { describe, expect, it } from "vitest";
import { calcStreak, prevDateKey } from "./streak";

describe("prevDateKey", () => {
  it("前日を返す（月・年またぎも）", () => {
    expect(prevDateKey("2026-07-15")).toBe("2026-07-14");
    expect(prevDateKey("2026-07-01")).toBe("2026-06-30");
    expect(prevDateKey("2026-01-01")).toBe("2025-12-31");
    expect(prevDateKey("2028-03-01")).toBe("2028-02-29"); // うるう年
  });
});

describe("calcStreak", () => {
  it("今日から連続した日数を数える", () => {
    expect(calcStreak(["2026-07-15", "2026-07-14", "2026-07-13"], "2026-07-15")).toBe(3);
  });

  it("今日まだ書いていなければ昨日までの連続を維持する", () => {
    expect(calcStreak(["2026-07-14", "2026-07-13"], "2026-07-15")).toBe(2);
  });

  it("連続が途切れていたら途切れる前は数えない", () => {
    expect(calcStreak(["2026-07-15", "2026-07-13", "2026-07-12"], "2026-07-15")).toBe(1);
  });

  it("一昨日以前しか記録がなければ 0", () => {
    expect(calcStreak(["2026-07-12"], "2026-07-15")).toBe(0);
    expect(calcStreak([], "2026-07-15")).toBe(0);
  });

  it("同じ日に複数記録があっても1日と数える", () => {
    expect(calcStreak(["2026-07-15", "2026-07-15", "2026-07-14"], "2026-07-15")).toBe(2);
  });
});
