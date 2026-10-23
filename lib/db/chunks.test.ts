import { describe, expect, it } from "vitest";
import {
  chunkCollectionPath,
  chunkDocData,
  chunkId,
  planChunks,
  prepareChunks,
  staleChunkIds,
  type ChunkSourceInput,
} from "./chunks";

const sentence = "今日は朝から会議が続いて、思ったより疲れてしまった。";
const full: ChunkSourceInput = {
  thoughtId: "t1",
  date: "2026-10-24",
  rawText: sentence.repeat(30),
  deepDiveQuestion: "何がいちばん疲れた？",
  deepDiveAnswer: "人の話を聞き続けること",
  kind: "full",
};

describe("chunks のパスと id", () => {
  it("チャンクは users/{uid} の下にある（アカウント削除の recursiveDelete で消える）", () => {
    expect(chunkCollectionPath("u1").startsWith("users/u1/")).toBe(true);
  });

  it("id は thoughtId_order", () => {
    expect(chunkId("abc", 2)).toBe("abc_2");
  });
});

describe("planChunks", () => {
  it("本文のチャンク＋深掘り Q&A。本文は一字も変えない", () => {
    const plan = planChunks(full);
    const diary = plan.filter((c) => c.source === "diary");
    expect(diary.length).toBeGreaterThan(1);
    expect(diary.map((c) => c.text).join("")).toBe(full.rawText);
    const last = plan[plan.length - 1];
    expect(last.source).toBe("deepdive");
    expect(last.text).toBe("Q: 何がいちばん疲れた？\nA: 人の話を聞き続けること");
    plan.forEach((c, i) => {
      expect(c.order).toBe(i);
      expect(c.id).toBe(`t1_${i}`);
      expect(c.thoughtId).toBe("t1");
      expect(c.date).toBe("2026-10-24");
      expect(c).not.toHaveProperty("meta"); // full のメタは 57 が足す
    });
  });

  it("quick は1チャンクで、気分の固定メタを付ける（気分なしなら付けない）", () => {
    const quick = { ...full, kind: "quick" as const, rawText: "いい風", deepDiveQuestion: "", deepDiveAnswer: "" };
    expect(planChunks({ ...quick, mood: 0 })).toEqual([
      {
        text: "いい風",
        source: "diary",
        order: 0,
        id: "t1_0",
        thoughtId: "t1",
        date: "2026-10-24",
        meta: "気分：追い風（とてもいい日）",
      },
    ]);
    expect(planChunks(quick)[0]).not.toHaveProperty("meta");
  });
});

describe("prepareChunks", () => {
  it("embedding の入力は text（＋meta）。順番どおりに付く", async () => {
    const seen: string[] = [];
    const quick = { ...full, kind: "quick" as const, rawText: "いい風", deepDiveQuestion: "", deepDiveAnswer: "", mood: 2 as const };
    const r = await prepareChunks(quick, async (texts) => {
      seen.push(...texts);
      return texts.map((_, i) => [i]);
    });
    expect(seen).toEqual(["いい風\n気分：凪（ふつうの日）"]);
    expect(r[0].embedding).toEqual([0]);
    expect(r[0].text).toBe("いい風"); // 表示用の text にメタは混ぜない
  });

  it("件数が合わなければ失敗する", async () => {
    await expect(prepareChunks(full, async () => [[1]])).rejects.toThrow();
  });
});

describe("chunkDocData", () => {
  it("契約どおりの項目だけを書く（meta は任意）", async () => {
    const [c] = await prepareChunks(
      { ...full, rawText: "短い日記です。", deepDiveAnswer: "" },
      async (t) => t.map(() => [0.5])
    );
    expect(chunkDocData(c, (v) => ({ vec: v }))).toEqual({
      thoughtId: "t1",
      date: "2026-10-24",
      text: "短い日記です。",
      source: "diary",
      order: 0,
      embedding: { vec: [0.5] },
    });
  });
});

describe("staleChunkIds", () => {
  it("編集で短くなったら余った order を消す", () => {
    expect(staleChunkIds(["t1_0", "t1_1", "t1_2"], ["t1_0", "t1_1"])).toEqual(["t1_2"]);
  });

  it("削除（新しいチャンクなし）は全部", () => {
    expect(staleChunkIds(["t1_0", "t1_1"], [])).toEqual(["t1_0", "t1_1"]);
  });

  it("増えたときは何も消さない", () => {
    expect(staleChunkIds(["t1_0"], ["t1_0", "t1_1"])).toEqual([]);
  });
});
