import { describe, expect, it } from "vitest";
import { cosineSimilarity, topKSimilar } from "./similarity";

describe("cosineSimilarity", () => {
  it("同一方向は 1、直交は 0、逆方向は -1", () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 5])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-3, 0])).toBeCloseTo(-1);
  });

  it("長さ不一致・ゼロベクトルは 0", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("topKSimilar", () => {
  const items = [
    { item: "a", embedding: [1, 0] },
    { item: "b", embedding: [0.9, 0.1] },
    { item: "c", embedding: [0, 1] },
    { item: "d", embedding: [-1, 0] },
  ];

  it("類似度の高い順に k 件返す", () => {
    const result = topKSimilar([1, 0], items, 2);
    expect(result.map((r) => r.item)).toEqual(["a", "b"]);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("k が件数を超えても全件で止まる", () => {
    expect(topKSimilar([1, 0], items, 10)).toHaveLength(4);
  });
});
