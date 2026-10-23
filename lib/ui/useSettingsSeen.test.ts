import { describe, expect, it, vi } from "vitest";

// Firebase を初期化しない（純粋関数だけを試す）
vi.mock("@/lib/db/useUser", () => ({ useUser: () => ({ user: null, loading: false }) }));

import { shouldShowGearDot } from "./useSettingsSeen";

describe("shouldShowGearDot", () => {
  it("連携済み（ゲストでない）なら出さない", () => {
    expect(shouldShowGearDot(false, null, "2026-10-25")).toBe(false);
  });

  it("ゲストでまだ設定を開いていなければ出す", () => {
    expect(shouldShowGearDot(true, null, "2026-10-25")).toBe(true);
  });

  it("設定を開いた日と、その後 6 日は出さない", () => {
    expect(shouldShowGearDot(true, "2026-10-25", "2026-10-25")).toBe(false);
    expect(shouldShowGearDot(true, "2026-10-25", "2026-10-31")).toBe(false);
  });

  it("7 日たつとまた出す（月をまたいでも）", () => {
    expect(shouldShowGearDot(true, "2026-10-25", "2026-11-01")).toBe(true);
    expect(shouldShowGearDot(true, "2026-10-28", "2026-11-04")).toBe(true);
  });

  it("壊れた値は未確認として扱う", () => {
    expect(shouldShowGearDot(true, "yesterday", "2026-10-25")).toBe(true);
  });

  it("未来の日付が入っていたら出さない", () => {
    expect(shouldShowGearDot(true, "2026-12-01", "2026-10-25")).toBe(false);
  });
});
