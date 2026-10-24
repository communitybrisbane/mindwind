import { describe, expect, it } from "vitest";
import {
  buildLetterEntries,
  countRecordDays,
  createQuoteLineFilter,
  formatLetterInput,
  isUsableLetter,
  parseLetterOutput,
  verifyQuote,
  type LetterThought,
} from "./letter";

const th = (o: Partial<LetterThought> & { id: string; date: string }): LetterThought => ({
  rawText: "",
  deepDiveQuestion: "",
  deepDiveAnswer: "",
  kind: "full",
  createdAt: `${o.date}T10:00:00.000Z`,
  ...o,
});

const tue = th({
  id: "t1",
  date: "2026-10-20",
  rawText: "会議で言いたいことはあったのに、タイミングが分からなかった。",
  deepDiveQuestion: "どんなタイミングなら言えそう？",
  deepDiveAnswer: "議題が変わる前なら言えたかも。",
});
const fri = th({ id: "t2", date: "2026-10-23", rawText: "先に一行だけメモしてから行ったら、少し話せた。" });
const sat = th({ id: "t3", date: "2026-10-24", rawText: "疲れた", kind: "quick" });

describe("buildLetterEntries", () => {
  it("日付順・本文 → 深掘りの順に番号を振る", () => {
    const entries = buildLetterEntries([fri, sat, tue]);
    expect(entries.map((e) => [e.n, e.thoughtId, e.source])).toEqual([
      [1, "t1", "diary"],
      [2, "t1", "deepdive"],
      [3, "t2", "diary"],
      [4, "t3", "diary"],
    ]);
    expect(entries[1]).toMatchObject({ text: "議題が変わる前なら言えたかも。", question: "どんなタイミングなら言えそう？" });
  });

  it("上限を超える週は、日ごとに新しい記録から入れてチャンクの境界で切る", () => {
    const old = th({ id: "a", date: "2026-10-20", rawText: "あ".repeat(30), createdAt: "2026-10-20T01:00:00.000Z" });
    const neu = th({ id: "b", date: "2026-10-20", rawText: "い".repeat(30), createdAt: "2026-10-20T09:00:00.000Z" });
    const other = th({ id: "c", date: "2026-10-21", rawText: "う".repeat(30) });
    const entries = buildLetterEntries([old, neu, other], 60);
    expect(entries.map((e) => e.thoughtId)).toEqual(["b", "c"]);
  });

  it("本文が空の記録は入れない", () => {
    expect(buildLetterEntries([th({ id: "x", date: "2026-10-20" })])).toEqual([]);
  });
});

describe("countRecordDays", () => {
  it("記録があった日数（同じ日は1日）", () => {
    expect(countRecordDays([tue, fri, sat, { ...fri, id: "t9" }])).toBe(3);
  });
});

describe("formatLetterInput", () => {
  it("下書き §3 の形で、気分やメタを含まない", () => {
    const text = formatLetterInput("2026-10-19", 3, buildLetterEntries([tue, fri]));
    expect(text).toBe(
      [
        "【今週】2026-10-19（月）〜2026-10-25（日）",
        "【記録した日数】3日",
        "",
        "【今週の記録（本人の言葉・日付順）】",
        "［1］2026-10-20（火）本文",
        "会議で言いたいことはあったのに、タイミングが分からなかった。",
        "",
        "［2］2026-10-20（火）深掘り",
        "Q（メンターの質問）：どんなタイミングなら言えそう？",
        "A（本人の答え）：議題が変わる前なら言えたかも。",
        "",
        "［3］2026-10-23（金）本文",
        "先に一行だけメモしてから行ったら、少し話せた。",
      ].join("\n")
    );
  });
});

describe("verifyQuote", () => {
  it("本文・答えの部分文字列そのものだけ通る", () => {
    expect(verifyQuote("タイミングが分からなかった。", tue)).toBe("タイミングが分からなかった。");
    expect(verifyQuote("議題が変わる前なら言えたかも。", tue)).toBe("議題が変わる前なら言えたかも。");
    expect(verifyQuote("タイミングがわからなかった。", tue)).toBeNull();
    expect(verifyQuote("どんなタイミングなら言えそう？", tue)).toBeNull(); // Q は引用しない
    expect(verifyQuote("。", tue)).toBeNull();
    expect(verifyQuote("タイミング", undefined)).toBeNull();
  });

  it("「」で囲まれていても中身が一字も違わなければ通る（中身だけ使う）", () => {
    expect(verifyQuote("「少し話せた。」", fri)).toBe("少し話せた。");
  });
});

describe("parseLetterOutput", () => {
  const thoughts = [tue, fri, sat];
  const entries = buildLetterEntries(thoughts);
  const map = new Map(thoughts.map((t) => [t.id, t]));

  it("段落と検証を通った引用をブロックにする", () => {
    const out = [
      "今週もおつかれさま。",
      "今週は3日、ここに来てくれたね。",
      "",
      "火曜の会議のあと、こう書いてた。",
      ">> ［1］言いたいことはあったのに、タイミングが分からなかった。",
      "そして金曜には、こうも書いてる。",
      ">> [3]少し話せた。",
      "",
      "来週の会議の前にも、一行だけメモしてみるのはどうかな。",
    ].join("\n");
    const { blocks, refs, droppedQuotes } = parseLetterOutput(out, entries, map);
    expect(blocks).toEqual([
      { type: "text", text: "今週もおつかれさま。\n今週は3日、ここに来てくれたね。" },
      { type: "text", text: "火曜の会議のあと、こう書いてた。" },
      { type: "quote", ref: 0 },
      { type: "text", text: "そして金曜には、こうも書いてる。" },
      { type: "quote", ref: 1 },
      { type: "text", text: "来週の会議の前にも、一行だけメモしてみるのはどうかな。" },
    ]);
    expect(refs).toEqual([
      { thoughtId: "t1", date: "2026-10-20", quote: "言いたいことはあったのに、タイミングが分からなかった。" },
      { thoughtId: "t2", date: "2026-10-23", quote: "少し話せた。" },
    ]);
    expect(droppedQuotes).toBe(0);
  });

  it("一致しない・番号が無い・範囲外・Q の引用は落とす（手紙は残す）", () => {
    const out = [
      "書き出し。",
      ">> ［1］言いたいことがあったのに、タイミングが分からなかった。", // 1字違い
      ">> ［9］少し話せた。", // 範囲外
      ">> 少し話せた。", // 番号なし
      ">> ［2］どんなタイミングなら言えそう？", // Q
      ">> ［3］少し話せた。",
    ].join("\n");
    const { blocks, refs, droppedQuotes } = parseLetterOutput(out, entries, map);
    expect(droppedQuotes).toBe(4);
    expect(refs).toHaveLength(1);
    expect(blocks).toEqual([
      { type: "text", text: "書き出し。" },
      { type: "quote", ref: 0 },
    ]);
  });

  it("同じ記録の同じ引用は refs を使い回す", () => {
    const out = "a\n>> ［3］少し話せた。\nb\n>> ［3］少し話せた。";
    const { blocks, refs } = parseLetterOutput(out, entries, map);
    expect(refs).toHaveLength(1);
    expect(blocks.filter((b) => b.type === "quote")).toEqual([
      { type: "quote", ref: 0 },
      { type: "quote", ref: 0 },
    ]);
  });

  it("引用なしの手紙（危機対応）もそのまま段落にする", () => {
    const { blocks, refs } = parseLetterOutput("受け止める文。\n\n窓口の案内。", entries, map);
    expect(refs).toEqual([]);
    expect(isUsableLetter(blocks)).toBe(true);
  });

  it("本文の段落が無ければ使えない", () => {
    expect(isUsableLetter(parseLetterOutput(">> ［3］少し話せた。", entries, map).blocks)).toBe(false);
    expect(isUsableLetter([])).toBe(false);
  });
});

describe("createQuoteLineFilter", () => {
  it("引用の行を抜き、ほかの行はそのまま流す", () => {
    const f = createQuoteLineFilter();
    let out = "";
    for (const d of ["今週も", "おつかれさま。\n>> ［1］言", "いたいこと\nそして", "金曜には\n\n最後"]) out += f.push(d);
    out += f.flush();
    expect(out).toBe("今週もおつかれさま。\nそして金曜には\n\n最後");
  });

  it("最後の行が引用なら流さない", () => {
    const f = createQuoteLineFilter();
    expect(f.push("a\n>> ［1］x")).toBe("a\n");
    expect(f.flush()).toBe("");
  });
});
