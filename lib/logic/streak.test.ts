import { describe, expect, it } from "vitest";
import {
  calcStreak,
  daysSinceLastRecord,
  isWelcomeBack,
  prevDateKey,
  unionDays,
  weekRecordDays,
} from "./streak";

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

describe("unionDays", () => {
  it("和集合を作る（重複なし・空でも動く）", () => {
    const u = unionDays(["2026-07-14", "2026-07-15"], new Set(["2026-07-15", "2026-07-16"]));
    expect([...u].sort()).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"]);
    expect(unionDays().size).toBe(0);
  });
});

describe("weekRecordDays", () => {
  // 2026-07-15 は水曜。週は 07-13(月)〜
  it("月曜はじまりで今日までを数える", () => {
    expect(weekRecordDays(["2026-07-13", "2026-07-14", "2026-07-15"], "2026-07-15")).toBe(3);
  });
  it("前の週の日曜は数えない", () => {
    expect(weekRecordDays(["2026-07-12", "2026-07-13"], "2026-07-15")).toBe(1);
  });
  it("月曜当日は月曜だけ・日曜は月〜日の7日が1週", () => {
    expect(weekRecordDays(["2026-07-12", "2026-07-13"], "2026-07-13")).toBe(1);
    expect(weekRecordDays(["2026-07-13", "2026-07-19", "2026-07-12"], "2026-07-19")).toBe(2);
  });
  it("重複と未来日は数えない・空は0", () => {
    expect(weekRecordDays(["2026-07-15", "2026-07-15", "2026-07-16"], "2026-07-15")).toBe(1);
    expect(weekRecordDays([], "2026-07-15")).toBe(0);
  });
  it("月またぎの週も数える", () => {
    expect(weekRecordDays(["2026-06-29", "2026-07-01"], "2026-07-02")).toBe(2);
  });
});

describe("daysSinceLastRecord", () => {
  it("今日なら0・昨日なら1", () => {
    expect(daysSinceLastRecord(["2026-07-15"], "2026-07-15")).toBe(0);
    expect(daysSinceLastRecord(["2026-07-14", "2026-07-01"], "2026-07-15")).toBe(1);
  });
  it("月またぎ・記録なしはnull・未来日は無視", () => {
    expect(daysSinceLastRecord(["2026-06-28"], "2026-07-02")).toBe(4);
    expect(daysSinceLastRecord([], "2026-07-15")).toBeNull();
    expect(daysSinceLastRecord(["2026-07-20"], "2026-07-15")).toBeNull();
  });
});

describe("isWelcomeBack", () => {
  it("空き2日までは false、3日以上で true（丸2日書かなかった）", () => {
    expect(isWelcomeBack(["2026-07-13"], "2026-07-15")).toBe(false); // 空き2
    expect(isWelcomeBack(["2026-07-12"], "2026-07-15")).toBe(true); // 空き3
  });
  it("記録なし・今日書いた日は false", () => {
    expect(isWelcomeBack([], "2026-07-15")).toBe(false);
    expect(isWelcomeBack(["2026-07-15"], "2026-07-15")).toBe(false);
  });
});
