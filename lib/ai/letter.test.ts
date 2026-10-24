import { describe, expect, it } from "vitest";
import { CRISIS_LETTER_PARAGRAPHS, hasHotlineGuidance } from "@/lib/logic/crisis";
import {
  applyLetterSafety,
  buildLetterEntries,
  countRecordDays,
  crisisLetterBlocks,
  detectCrisisWeek,
  formatLetterInput,
  isUsableLetter,
  parseLetterOutput,
  verifyBodyQuotes,
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

  it("本文の「」が記録に無い言葉なら、その段落を落とす（短い囲みは見ない）", () => {
    const out = [
      "火曜は「言いたいことはあったのに」と書いてたね。", // 記録にある → 残す
      "",
      "金曜には「メモを書いてから話せた」と書いてる。", // 言い換え → 落とす
      "",
      "同じ「会議」でも、動き方が少し違ったみたい。", // 2字の囲みは強調 → 残す
      "",
      ">> ［3］少し話せた。",
    ].join("\n");
    const { blocks, refs, droppedParagraphs } = parseLetterOutput(out, entries, map);
    expect(droppedParagraphs).toBe(1);
    expect(blocks).toEqual([
      { type: "text", text: "火曜は「言いたいことはあったのに」と書いてたね。" },
      { type: "text", text: "同じ「会議」でも、動き方が少し違ったみたい。" },
      { type: "quote", ref: 0 },
    ]);
    expect(refs).toHaveLength(1);
  });

  it("本文の段落が無ければ使えない", () => {
    expect(isUsableLetter(parseLetterOutput(">> ［3］少し話せた。", entries, map).blocks)).toBe(false);
    expect(isUsableLetter([])).toBe(false);
  });
});

describe("verifyBodyQuotes", () => {
  it("囲みが無い・短い・記録にある言葉なら通る。Q だけにある言葉と言い換えは通らない", () => {
    expect(verifyBodyQuotes("囲みのない文。", [tue])).toBe(true);
    expect(verifyBodyQuotes("『議題が変わる前なら』と答えてた。", [tue])).toBe(true);
    expect(verifyBodyQuotes("「どんなタイミングなら言えそう？」と聞かれて", [tue])).toBe(false);
    expect(verifyBodyQuotes("「タイミングがわからなかった」と書いてた。", [tue])).toBe(false);
  });
});

describe("セーフティ（憲法第8条）", () => {
  const crisisThought = th({ id: "c1", date: "2026-10-21", rawText: "もう消えたい。会議のことばかり考えてしまう。" });
  const thoughts = [tue, crisisThought, fri];
  const entries = buildLetterEntries(thoughts);
  const map = new Map(thoughts.map((t) => [t.id, t]));
  const hotline = "いのちの電話 0570-783-556、よりそいホットライン 0120-279-338";

  it("detectCrisisWeek：その週の本人の言葉に危機の言葉があれば true（Q は見ない）", () => {
    expect(detectCrisisWeek(entries)).toBe(true);
    expect(detectCrisisWeek(buildLetterEntries([tue, fri]))).toBe(false);
    expect(detectCrisisWeek([{ text: "ふつうの日" }])).toBe(false);
  });

  it("危機の週：AI が引用を付けても落とし、窓口の案内が無ければ固定文を足す", () => {
    // 番号：［1］火曜の本文・［2］火曜の深掘り・［3］水曜（危機の言葉）・［4］金曜
    const out = ["受け止める文。", ">> ［3］もう消えたい。", "", "次の一歩の提案。"].join("\n");
    const parsed = parseLetterOutput(out, entries, map);
    expect(parsed.refs).toHaveLength(1);
    const safe = applyLetterSafety(parsed, true);
    expect(safe.quotesRemoved).toBe(true);
    expect(safe.hotlineAdded).toBe(true);
    expect(safe.refs).toEqual([]);
    expect(safe.blocks.every((b) => b.type === "text")).toBe(true);
    expect(hasHotlineGuidance(safe.blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n"))).toBe(true);
    expect(safe.blocks[0]).toEqual({ type: "text", text: "受け止める文。" });
  });

  it("危機の週：AI が窓口を案内していれば、そのまま（引用だけ落とす）", () => {
    const parsed = parseLetterOutput(`受け止める文。\n\n${hotline}`, entries, map);
    const safe = applyLetterSafety(parsed, true);
    expect(safe.hotlineAdded).toBe(false);
    expect(safe.quotesRemoved).toBe(false);
    expect(safe.blocks).toEqual(parsed.blocks);
  });

  it("ふつうの週：AI 自身が窓口を案内した手紙なら引用を落とす。そうでなければ何も変えない", () => {
    const plain = parseLetterOutput("a\n>> ［3］少し話せた。\nb", buildLetterEntries([tue, fri]), map);
    const kept = applyLetterSafety(plain, false);
    expect(kept.blocks).toEqual(plain.blocks);
    expect(kept.refs).toEqual(plain.refs);
    expect(kept.quotesRemoved).toBe(false);

    const judged = parseLetterOutput(`a\n>> ［3］少し話せた。\n${hotline}`, buildLetterEntries([tue, fri]), map);
    const safe = applyLetterSafety(judged, false);
    expect(safe.refs).toEqual([]);
    expect(safe.quotesRemoved).toBe(true);
    expect(safe.hotlineAdded).toBe(false);
  });

  it("固定文の手紙は本文だけで、窓口の案内を含み、使える", () => {
    const blocks = crisisLetterBlocks();
    expect(blocks.map((b) => (b.type === "text" ? b.text : ""))).toEqual([...CRISIS_LETTER_PARAGRAPHS]);
    expect(isUsableLetter(blocks)).toBe(true);
    expect(hasHotlineGuidance(CRISIS_LETTER_PARAGRAPHS.join("\n"))).toBe(true);
  });
});
