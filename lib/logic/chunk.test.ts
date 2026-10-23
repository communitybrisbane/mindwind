import { describe, expect, it } from "vitest";
import { splitIntoChunks } from "./chunk";

const base = { deepDiveQuestion: "", deepDiveAnswer: "", kind: "full" as const };
const sentence = "今日は朝から会議が続いて、思ったより疲れてしまった。";
const long = (n: number) => sentence.repeat(n);
const diaryJoin = (cs: ReturnType<typeof splitIntoChunks>) =>
  cs.filter((c) => c.source === "diary").map((c) => c.text).join("");

describe("splitIntoChunks", () => {
  it("短い本文は1チャンク", () => {
    const r = splitIntoChunks({ ...base, rawText: "短い日記。" });
    expect(r).toEqual([{ text: "短い日記。", source: "diary", order: 0 }]);
  });

  it("空の本文は diary チャンクなし", () => {
    expect(splitIntoChunks({ ...base, rawText: "" })).toEqual([]);
  });

  it("連結すると元の本文に戻る（空白・改行も一字も変えない）", () => {
    const text = `${long(8)}\n\n  ${long(6)}！ ？\n${long(5)}\n\n\nおわり`;
    expect(diaryJoin(splitIntoChunks({ ...base, rawText: text }))).toBe(text);
  });

  it("長い本文は複数に分かれ、文の途中で切らない", () => {
    const text = long(40);
    const r = splitIntoChunks({ ...base, rawText: text });
    expect(r.length).toBeGreaterThan(1);
    for (const c of r) {
      expect(c.text.endsWith("。")).toBe(true);
      expect(c.text.length).toBeLessThanOrEqual(400);
    }
    expect(diaryJoin(r)).toBe(text);
  });

  it("最後の端数チャンクを小さく残さない", () => {
    const text = long(16) + "おわり。";
    const r = splitIntoChunks({ ...base, rawText: text });
    expect(r[r.length - 1].text.length).toBeGreaterThan(20);
    expect(diaryJoin(r)).toBe(text);
  });

  it("長すぎる1文は切らずに1チャンクに置く", () => {
    const text = "あ".repeat(500) + "。短い。";
    const r = splitIntoChunks({ ...base, rawText: text });
    expect(diaryJoin(r)).toBe(text);
    expect(r[0].text.startsWith("あ".repeat(500) + "。")).toBe(true);
  });

  it("文末記号が無いテキストでも書き換えない", () => {
    const text = "あ".repeat(900);
    expect(diaryJoin(splitIntoChunks({ ...base, rawText: text }))).toBe(text);
  });

  it("深掘りの質問と答えは1チャンク（最後・deepdive）", () => {
    const r = splitIntoChunks({
      ...base,
      rawText: long(30),
      deepDiveQuestion: "なぜ疲れたと思う？",
      deepDiveAnswer: "人に気を使いすぎたから。",
    });
    const last = r[r.length - 1];
    expect(last).toEqual({
      text: "Q: なぜ疲れたと思う？\nA: 人に気を使いすぎたから。",
      source: "deepdive",
      order: r.length - 1,
    });
    expect(r.filter((c) => c.source === "deepdive")).toHaveLength(1);
  });

  it("答えが空なら deepdive チャンクを作らない", () => {
    const r = splitIntoChunks({ ...base, rawText: "あ", deepDiveQuestion: "?", deepDiveAnswer: "  " });
    expect(r.every((c) => c.source === "diary")).toBe(true);
  });

  it("order は 0 始まりで連番", () => {
    const r = splitIntoChunks({ ...base, rawText: long(30), deepDiveQuestion: "q", deepDiveAnswer: "a" });
    expect(r.map((c) => c.order)).toEqual(r.map((_, i) => i));
  });

  it("quick は本文1チャンク（深掘りがあれば追加）", () => {
    const text = long(30);
    const r = splitIntoChunks({ ...base, kind: "quick", rawText: text });
    expect(r).toEqual([{ text, source: "diary", order: 0 }]);
    const r2 = splitIntoChunks({ ...base, kind: "quick", rawText: "ふつう", deepDiveQuestion: "q", deepDiveAnswer: "a" });
    expect(r2).toHaveLength(2);
  });
});
