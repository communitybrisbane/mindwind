import { describe, expect, it } from "vitest";
import { toRagThought } from "./ragThought";

describe("toRagThought", () => {
  it("embedding・生テキスト・深掘り・メタ情報・距離を除き、id を付ける", () => {
    const out = toRagThought("t1", {
      date: "2026-01-01",
      title: "題",
      embedding: [1, 2],
      rawText: "raw",
      deepDiveQuestion: "q",
      deepDiveAnswer: "a",
      createdAt: 1,
      tags: ["x"],
      distance: 0.1,
    }) as unknown as Record<string, unknown>;
    expect(out).toEqual({ id: "t1", date: "2026-01-01", title: "題" });
  });
});
