import { describe, expect, it } from "vitest";
import {
  cosineDistanceToSimilarity,
  dateWithWeekday,
  formatRagBlock,
  groupChunkHits,
  joinChunks,
  RAG_EMPTY_LINE,
  type ChunkHit,
} from "./ragChunks";

const hit = (thoughtId: string, order: number, similarity: number, text = `${thoughtId}-${order}`): ChunkHit => ({
  thoughtId,
  date: "2026-10-20",
  text,
  order,
  similarity,
});

describe("groupChunkHits", () => {
  it("記録ごとにまとめ、最も高い類似度で並べて上位 topK 件", () => {
    const out = groupChunkHits(
      [hit("a", 0, 0.5), hit("b", 0, 0.9), hit("a", 1, 0.8), hit("c", 0, 0.6), hit("d", 0, 0.55)],
      { topK: 3 }
    );
    expect(out.map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(out[1].similarity).toBe(0.8);
  });

  it("しきい値未満のチャンクは落とす（記録ごと消えることもある）", () => {
    const out = groupChunkHits([hit("a", 0, 0.2), hit("b", 0, 0.4), hit("b", 1, 0.1)], { minSimilarity: 0.3 });
    expect(out.map((t) => t.id)).toEqual(["b"]);
    expect(out[0].quote).toBe("b-0");
  });

  it("同じ記録のチャンクは order 順につなぐ（検索結果の順ではない）", () => {
    const out = groupChunkHits([hit("a", 2, 0.5, "三"), hit("a", 0, 0.4, "一"), hit("a", 1, 0.45, "二")]);
    expect(out[0].quote).toBe("一\n二\n三");
  });

  it("同じチャンクが二度来ても重ねない", () => {
    const out = groupChunkHits([hit("a", 0, 0.5, "x"), hit("a", 0, 0.5, "x")]);
    expect(out[0].quote).toBe("x");
  });

  it("空なら空", () => {
    expect(groupChunkHits([])).toEqual([]);
  });
});

describe("joinChunks", () => {
  it("上限を超えるときはチャンクの境界で止める。最初の1つは必ず入れる", () => {
    const long = "あ".repeat(900);
    expect(joinChunks([{ text: long, order: 0 }, { text: "次", order: 1 }], 800)).toBe(long);
    expect(joinChunks([{ text: "一".repeat(400), order: 0 }, { text: "二".repeat(400), order: 1 }], 800)).toBe(
      "一".repeat(400)
    );
    expect(joinChunks([{ text: "一".repeat(300), order: 0 }, { text: "二".repeat(300), order: 1 }], 800)).toBe(
      `${"一".repeat(300)}\n${"二".repeat(300)}`
    );
  });
});

describe("formatRagBlock", () => {
  it("日付（曜日つき）と本人の言葉だけ。タイトルは渡さない", () => {
    const block = formatRagBlock([
      { id: "a", date: "2026-10-20", title: "題", quote: "今日は疲れた。" },
      { id: "b", date: "2026-10-23", title: "題2", quote: "Q: どこが？\nA: 肩。" },
    ]);
    expect(block).toBe(
      "【参考：ユーザーの過去の記録（本人の言葉・関連順・最大5件）】\n\n1. 2026-10-20（火）\n今日は疲れた。\n\n2. 2026-10-23（金）\nQ: どこが？\nA: 肩。"
    );
    expect(block).not.toContain("題");
  });

  it("0件のときは空のブロックではなく、無いことを伝える一行", () => {
    expect(formatRagBlock([])).toContain(RAG_EMPTY_LINE);
  });
});

describe("helpers", () => {
  it("距離→類似度・曜日", () => {
    expect(cosineDistanceToSimilarity(0.25)).toBeCloseTo(0.75);
    expect(dateWithWeekday("2026-10-24")).toBe("2026-10-24（土）");
    expect(dateWithWeekday("bad")).toBe("bad");
  });
});
