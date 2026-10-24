import { describe, expect, it, vi } from "vitest";

vi.mock("firebase/auth", () => ({ signInAnonymously: vi.fn() }));
vi.mock("@/lib/db/firebase", () => ({ auth: {} }));
vi.mock("@/lib/db/useUser", () => ({ useUser: vi.fn() }));

import { ANON_RETRY_DELAYS_MS, nextRetryDelay } from "./useEnsureUser";

describe("nextRetryDelay", () => {
  it("失敗のたびに、決めた間隔で再試行する", () => {
    expect(nextRetryDelay(1)).toBe(ANON_RETRY_DELAYS_MS[0]);
    expect(nextRetryDelay(2)).toBe(ANON_RETRY_DELAYS_MS[1]);
    expect(nextRetryDelay(3)).toBe(ANON_RETRY_DELAYS_MS[2]);
  });

  it("間隔はだんだん長くなる", () => {
    const d = [1, 2, 3].map((n) => nextRetryDelay(n) as number);
    expect(d[0]).toBeLessThan(d[1]);
    expect(d[1]).toBeLessThan(d[2]);
  });

  it("使い切ったら null（エラー表示に切り替える）", () => {
    expect(nextRetryDelay(ANON_RETRY_DELAYS_MS.length + 1)).toBeNull();
    expect(nextRetryDelay(99)).toBeNull();
  });

  it("間隔の列を渡せる。空なら最初から null", () => {
    expect(nextRetryDelay(1, [10])).toBe(10);
    expect(nextRetryDelay(2, [10])).toBeNull();
    expect(nextRetryDelay(1, [])).toBeNull();
  });

  it("0 以下や小数は最初の間隔として扱う", () => {
    expect(nextRetryDelay(0)).toBe(ANON_RETRY_DELAYS_MS[0]);
    expect(nextRetryDelay(1.5)).toBe(ANON_RETRY_DELAYS_MS[0]);
  });
});
