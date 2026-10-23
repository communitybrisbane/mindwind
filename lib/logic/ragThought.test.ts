import { describe, expect, it } from "vitest";
import { legacyToRagThought } from "./ragThought";

describe("legacyToRagThought", () => {
  it("rawText があれば本人の言葉をそのまま quote にする（深掘りは Q/A で後ろに付く）", () => {
    const out = legacyToRagThought("t1", {
      date: "2026-01-01",
      title: "題",
      rawText: "今日は疲れた。",
      deepDiveQuestion: "どこが？",
      deepDiveAnswer: "肩。",
      embedding: [1, 2],
      event: "成形された出来事",
    });
    expect(out).toEqual({
      id: "t1",
      date: "2026-01-01",
      title: "題",
      quote: "今日は疲れた。\nQ: どこが？\nA: 肩。",
    });
  });

  it("rawText が無い旧記録は残っている6項目を並べ、空の項目は飛ばす", () => {
    const out = legacyToRagThought("t2", {
      date: "2025-12-31",
      event: "会議で発言できなかった",
      emotion: "もどかしい",
      values: "",
    });
    expect(out.quote).toBe("出来事：会議で発言できなかった\n感情：もどかしい");
    expect(out.title).toBe("出来事：会議で発言できなかった");
  });

  it("日付・題が無くても落ちない", () => {
    const out = legacyToRagThought("t3", {});
    expect(out).toEqual({ id: "t3", date: "", title: "", quote: "" });
  });
});
