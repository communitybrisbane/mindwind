import { describe, expect, it } from "vitest";
import { MOOD_IDS } from "@/lib/logic/moods";
import { ICON_NAMES, ICON_PATHS, MOOD_GLYPHS } from "./iconPaths";

describe("ICON_PATHS", () => {
  it("契約の 21 種がそろい、余分がない", () => {
    expect(ICON_NAMES).toHaveLength(21);
    expect(Object.keys(ICON_PATHS).sort()).toEqual([...ICON_NAMES].sort());
  });

  it("どれも SVG の図形だけ（script などを含まない）", () => {
    for (const name of ICON_NAMES) {
      const s = ICON_PATHS[name];
      expect(s.length).toBeGreaterThan(0);
      expect(s).toMatch(/^(<(path|circle) [^<>]*\/>)+$/);
    }
  });
});

describe("MOOD_GLYPHS", () => {
  it("5段階すべてに風の絵がある", () => {
    for (const id of MOOD_IDS) {
      expect(MOOD_GLYPHS[id].length).toBeGreaterThan(0);
      for (const d of MOOD_GLYPHS[id]) expect(d).toMatch(/^M/);
    }
  });
});
