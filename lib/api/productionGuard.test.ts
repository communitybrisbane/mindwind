import { beforeEach, describe, expect, it, vi } from "vitest";
import { productionConfigWarnings, resetProductionWarningForTests, warnProductionConfigOnce } from "./productionGuard";

const full = {
  NODE_ENV: "production",
  ENFORCE_APP_CHECK: "enforce",
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: "key",
  UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "t",
};

describe("productionConfigWarnings", () => {
  it("本番以外では何も言わない", () => {
    expect(productionConfigWarnings({ NODE_ENV: "development" })).toEqual([]);
    expect(productionConfigWarnings({})).toEqual([]);
  });
  it("全部そろっていれば空", () => {
    expect(productionConfigWarnings(full)).toEqual([]);
  });
  it("App Check が enforce でない・鍵が無い・Upstash が無いときに1つずつ言う", () => {
    const w = productionConfigWarnings({ NODE_ENV: "production" });
    expect(w).toHaveLength(3);
    expect(w[0]).toContain("ENFORCE_APP_CHECK");
    expect(w[1]).toContain("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY");
    expect(w[2]).toContain("UPSTASH");
  });
  it("monitor も警告（enforce だけが合格）", () => {
    expect(productionConfigWarnings({ ...full, ENFORCE_APP_CHECK: "monitor" })).toHaveLength(1);
  });
  it("RATE_LIMIT_DISABLED=true は Upstash があっても警告", () => {
    const w = productionConfigWarnings({ ...full, RATE_LIMIT_DISABLED: "true" });
    expect(w).toEqual([expect.stringContaining("RATE_LIMIT_DISABLED")]);
  });
});

describe("warnProductionConfigOnce", () => {
  beforeEach(() => resetProductionWarningForTests());
  it("1回だけ出す", () => {
    const log = vi.fn();
    expect(warnProductionConfigOnce({ NODE_ENV: "production" }, log)).toHaveLength(3);
    expect(log).toHaveBeenCalledTimes(3);
    expect(warnProductionConfigOnce({ NODE_ENV: "production" }, log)).toEqual([]);
    expect(log).toHaveBeenCalledTimes(3);
  });
});
