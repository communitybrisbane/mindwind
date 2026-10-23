import { describe, expect, it } from "vitest";
import { TABS, activeTabHref, isTabBarHidden } from "./tabIcons";

describe("TABS", () => {
  it("ホーム=stack／記録=book／相談=swirl の順", () => {
    expect(TABS.map((t) => [t.href, t.label, t.icon])).toEqual([
      ["/home", "ホーム", "stack"],
      ["/record", "記録", "book"],
      ["/search", "相談", "swirl"],
    ]);
  });
});

describe("isTabBarHidden", () => {
  it.each(["/mood", "/mood/write", "/letter", "/letter?week=x".split("?")[0], "/wind", "/settings"])(
    "%s では隠す",
    (p) => expect(isTabBarHidden(p)).toBe(true),
  );
  it.each(["/home", "/record", "/search", "/", "/moodx", "/letters-old", null, undefined])(
    "%s では出す",
    (p) => expect(isTabBarHidden(p)).toBe(false),
  );
});

describe("activeTabHref", () => {
  it("パスの先頭で選ぶ", () => {
    expect(activeTabHref("/home")).toBe("/home");
    expect(activeTabHref("/record")).toBe("/record");
    expect(activeTabHref("/search/abc")).toBe("/search");
  });
  it("前方一致の取り違えをしない", () => {
    expect(activeTabHref("/homework")).toBeNull();
    expect(activeTabHref("/")).toBeNull();
    expect(activeTabHref(null)).toBeNull();
  });
});
