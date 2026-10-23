import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/useUser", () => ({
  useUser: () => ({ user: null, loading: false }),
  authedFetch: vi.fn(),
  authedJson: vi.fn(),
}));

import type { LetterBlock } from "@/lib/db/types";
import { sampleLetter, splitIntoPanels } from "./useLetter";

const t = (n: number): LetterBlock => ({ type: "text", text: "あ".repeat(n) });
const q = (ref: number): LetterBlock => ({ type: "quote", ref });

describe("splitIntoPanels", () => {
  it("順番を変えずに全部のブロックを3枚に配る", () => {
    const blocks = [t(40), t(20), q(0), t(20), q(1), t(30), t(50)];
    const panels = splitIntoPanels(blocks);
    expect(panels.flat()).toEqual(blocks);
    expect(panels.every((p) => p.length > 0)).toBe(true);
  });

  it("ブロックが3つなら1枚に1つずつ", () => {
    const blocks = [t(10), t(10), t(10)];
    expect(splitIntoPanels(blocks).map((p) => p.length)).toEqual([1, 1, 1]);
  });

  it("ブロックが少なくても落とさない", () => {
    expect(splitIntoPanels([]).flat()).toEqual([]);
    expect(splitIntoPanels([t(10)]).flat()).toHaveLength(1);
  });

  it("1枚目は頭のぶん軽い", () => {
    const blocks = Array.from({ length: 9 }, () => t(60));
    const [p1, , p3] = splitIntoPanels(blocks);
    expect(p1.length).toBeLessThanOrEqual(p3.length + 1);
    expect(p1.length).toBeLessThan(5);
  });
});

describe("sampleLetter", () => {
  it("週の月曜〜日曜と、引用の参照がそろう", () => {
    const l = sampleLetter("2026-10-19");
    expect(l.from).toBe("2026-10-19");
    expect(l.to).toBe("2026-10-25");
    expect(l.moods).toHaveLength(7);
    for (const b of l.blocks) if (b.type === "quote") expect(l.refs[b.ref]).toBeDefined();
  });
});
