import { describe, expect, it } from "vitest";
import { parseRange } from "./moodRange";

const TODAY = "2026-10-24";

describe("parseRange", () => {
  it("正しい範囲を通す", () => {
    expect(parseRange("2026-10-01", "2026-10-24", TODAY)).toEqual({
      ok: true,
      from: "2026-10-01",
      to: "2026-10-24",
    });
  });
  it("未来の to は今日に丸める", () => {
    expect(parseRange("2026-10-01", "2026-10-31", TODAY)).toEqual({
      ok: true,
      from: "2026-10-01",
      to: TODAY,
    });
  });
  it("欠落・不正形式・from>to・366日超・未来だけは不可", () => {
    expect(parseRange(null, TODAY, TODAY).ok).toBe(false);
    expect(parseRange("2026-10-01", null, TODAY).ok).toBe(false);
    expect(parseRange("2026/10/01", TODAY, TODAY).ok).toBe(false);
    expect(parseRange("2026-02-30", TODAY, TODAY).ok).toBe(false);
    expect(parseRange("2026-10-20", "2026-10-10", TODAY).ok).toBe(false);
    expect(parseRange("2025-10-23", TODAY, TODAY).ok).toBe(false); // 367日
    expect(parseRange("2025-10-24", TODAY, TODAY).ok).toBe(true); // 366日
    expect(parseRange("2026-10-26", "2026-10-28", TODAY).ok).toBe(false);
  });
});
