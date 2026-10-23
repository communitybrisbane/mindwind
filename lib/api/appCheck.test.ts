import { describe, expect, it, vi } from "vitest";
import { appCheckMode, checkAppCheck } from "./appCheck";

describe("appCheckMode", () => {
  it("既定は off", () => {
    expect(appCheckMode(undefined)).toBe("off");
    expect(appCheckMode("")).toBe("off");
    expect(appCheckMode("false")).toBe("off");
  });
  it("monitor と enforce", () => {
    expect(appCheckMode("monitor")).toBe("monitor");
    expect(appCheckMode(" Enforce ")).toBe("enforce");
    expect(appCheckMode("true")).toBe("enforce");
  });
});

describe("checkAppCheck", () => {
  const h = (token?: string) => new Headers(token ? { "X-Firebase-AppCheck": token } : {});

  it("off は検証しない", async () => {
    const verify = vi.fn();
    expect(await checkAppCheck(h(), "off", verify)).toEqual({ ok: true });
    expect(verify).not.toHaveBeenCalled();
  });
  it("enforce は失敗で止める", async () => {
    expect(await checkAppCheck(h("bad"), "enforce", async () => false)).toEqual({ ok: false });
    expect(await checkAppCheck(h("good"), "enforce", async (t) => t === "good")).toEqual({ ok: true });
  });
  it("monitor は失敗でも通す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await checkAppCheck(h(), "monitor", async () => false)).toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
