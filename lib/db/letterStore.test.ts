import { describe, expect, it } from "vitest";
import { scrubLetterRefs } from "@/lib/logic/deletedRefs";
import { decideBegin, GENERATING_STALE_MS, maskMissingRefs, toLetter, toLetterSummary, toMoodWeek } from "./letterStore";

describe("decideBegin", () => {
  const now = 1_000_000_000;
  it("無い・failed なら始める", () => {
    expect(decideBegin(null, now)).toBe("start");
    expect(decideBegin({ status: "failed", startedAt: now }, now)).toBe("start");
  });
  it("届いていれば作らない", () => {
    expect(decideBegin({ status: "ready", startedAt: undefined }, now)).toBe("ready");
  });
  it("生成中なら作らない。止まった生成中は作り直す", () => {
    expect(decideBegin({ status: "generating", startedAt: now - 1000 }, now)).toBe("generating");
    expect(decideBegin({ status: "generating", startedAt: now - GENERATING_STALE_MS }, now)).toBe("start");
    expect(decideBegin({ status: "generating", startedAt: undefined }, now)).toBe("start");
  });
});

describe("toMoodWeek", () => {
  it("7日分にそろえ、壊れた値は null", () => {
    expect(toMoodWeek([1, 9, null, "2", 4])).toEqual([1, null, null, null, 4, null, null]);
    expect(toMoodWeek(undefined)).toHaveLength(7);
  });
});

describe("toLetter", () => {
  it("内部の項目（genId など）を返さず、範囲外の引用ブロックを落とす", () => {
    const letter = toLetter("2026-10-19", {
      status: "ready",
      blocks: [{ type: "text", text: "a" }, { type: "quote", ref: 0 }, { type: "quote", ref: 5 }, { type: "x" }],
      refs: [{ thoughtId: "t1", date: "2026-10-20", quote: "q" }],
      moods: [1, null, null, null, null, null, 3],
      recordDays: 3,
      model: "claude-opus-4-8",
      genId: "secret",
      startedAt: 1,
      readAt: null,
      createdAt: new Date("2026-10-25T01:00:00.000Z"),
    });
    expect(letter).toEqual({
      weekKey: "2026-10-19",
      from: "2026-10-19",
      to: "2026-10-25",
      status: "ready",
      blocks: [{ type: "text", text: "a" }, { type: "quote", ref: 0 }],
      refs: [{ thoughtId: "t1", date: "2026-10-20", quote: "q" }],
      moods: [1, null, null, null, null, null, 3],
      recordDays: 3,
      model: "claude-opus-4-8",
      readAt: null,
      createdAt: "2026-10-25T01:00:00.000Z",
    });
    expect(toLetterSummary(letter)).toEqual({
      weekKey: "2026-10-19",
      from: "2026-10-19",
      to: "2026-10-25",
      status: "ready",
      recordDays: 3,
      readAt: null,
      createdAt: "2026-10-25T01:00:00.000Z",
    });
  });

  it("伏せた引用は本文を返さない", () => {
    const letter = toLetter("2026-10-19", {
      status: "ready",
      refs: [{ thoughtId: "t1", date: "2026-10-20", quote: "残っていた", deleted: true }],
    });
    expect(letter.refs).toEqual([{ thoughtId: "t1", date: "2026-10-20", quote: "", deleted: true }]);
  });

  it("scrubDeleted が伏せた refs をそのまま読める", () => {
    const { refs } = scrubLetterRefs([{ thoughtId: "t1", date: "2026-10-20", quote: "q" }], "t1");
    expect(toLetter("2026-10-19", { status: "ready", refs }).refs).toEqual([
      { thoughtId: "t1", date: "2026-10-20", quote: "", deleted: true },
    ]);
  });
});

describe("maskMissingRefs", () => {
  it("消えた記録の引用だけ伏せる（scrubDeleted と同じ形）", () => {
    const refs = [
      { thoughtId: "t1", date: "2026-10-20", quote: "a" },
      { thoughtId: "t2", date: "2026-10-23", quote: "b" },
    ];
    expect(maskMissingRefs(refs, new Set(["t2"]))).toEqual([
      { thoughtId: "t1", date: "2026-10-20", quote: "", deleted: true },
      { thoughtId: "t2", date: "2026-10-23", quote: "b" },
    ]);
    expect(refs[0].quote).toBe("a");
  });
});
