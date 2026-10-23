import { describe, expect, it } from "vitest";
import {
  embeddingInput,
  formatShapedFields,
  parseCreateThought,
  parseUpdateThought,
  sortNewestFirst,
  toIsoString,
  toThoughtSummary,
} from "./recordText";

const TODAY = "2026-10-24";
const DIARY = "今日は初めて一人で提案をした。緊張したけど最後まで話せた。";

describe("embeddingInput", () => {
  it("meta があれば改行でつなぐ", () => {
    expect(embeddingInput("本文", "気分：凪（ふつうの日）")).toBe("本文\n気分：凪（ふつうの日）");
    expect(embeddingInput("本文")).toBe("本文");
    expect(embeddingInput("本文", "")).toBe("本文");
  });
});

describe("parseCreateThought", () => {
  it("full：本文と深掘りをそのまま保存（書き換えない）", () => {
    const r = parseCreateThought(
      { rawText: `  ${DIARY}\n`, deepDiveQuestion: "なぜ？", deepDiveAnswer: " 伝えたかった " },
      TODAY
    );
    expect(r).toEqual({
      ok: true,
      value: {
        rawText: `  ${DIARY}\n`,
        deepDiveQuestion: "なぜ？",
        deepDiveAnswer: " 伝えたかった ",
        kind: "full",
        date: TODAY,
        isPast: false,
      },
    });
  });

  it("full：10文字未満は too_short・5000文字超は too_long", () => {
    expect(parseCreateThought({ rawText: "短い" }, TODAY)).toEqual({ ok: false, error: "too_short" });
    expect(parseCreateThought({ rawText: "あ".repeat(5001) }, TODAY)).toEqual({ ok: false, error: "too_long" });
    expect(parseCreateThought({ rawText: DIARY, deepDiveAnswer: "あ".repeat(5001) }, TODAY)).toEqual({
      ok: false,
      error: "too_long",
    });
  });

  it("quick：trim して 2〜60 文字。深掘りは持たない", () => {
    expect(parseCreateThought({ rawText: " いい風 ", kind: "quick", deepDiveAnswer: "x" }, TODAY)).toEqual({
      ok: true,
      value: { rawText: "いい風", deepDiveQuestion: "", deepDiveAnswer: "", kind: "quick", date: TODAY, isPast: false },
    });
    expect(parseCreateThought({ rawText: "あ", kind: "quick" }, TODAY)).toEqual({ ok: false, error: "too_short" });
    expect(parseCreateThought({ rawText: "あ".repeat(61), kind: "quick" }, TODAY)).toEqual({
      ok: false,
      error: "too_long",
    });
  });

  it("形が違えば invalid_body", () => {
    for (const body of [null, "x", [], {}, { rawText: 1 }, { rawText: DIARY, kind: "long" }, { rawText: DIARY, deepDiveAnswer: 3 }]) {
      expect(parseCreateThought(body, TODAY)).toEqual({ ok: false, error: "invalid_body" });
    }
  });

  it("日付：過去日は isPast、未来・不正は invalid_date", () => {
    const past = parseCreateThought({ rawText: DIARY, date: "2026-10-20" }, TODAY);
    expect(past.ok && past.value).toMatchObject({ date: "2026-10-20", isPast: true });
    expect(parseCreateThought({ rawText: DIARY, date: "2026-10-25" }, TODAY)).toEqual({ ok: false, error: "invalid_date" });
    expect(parseCreateThought({ rawText: DIARY, date: "2026-02-30" }, TODAY)).toEqual({ ok: false, error: "invalid_date" });
  });
});

describe("parseUpdateThought", () => {
  const current = { rawText: DIARY, deepDiveQuestion: "なぜ？", deepDiveAnswer: "", kind: "full" as const };

  it("送った項目だけ置き換える", () => {
    expect(parseUpdateThought({ deepDiveAnswer: "伝えたかった" }, current)).toEqual({
      ok: true,
      value: { rawText: DIARY, deepDiveQuestion: "なぜ？", deepDiveAnswer: "伝えたかった" },
    });
  });

  it("何も無い・型違いは invalid_body", () => {
    expect(parseUpdateThought({}, current)).toEqual({ ok: false, error: "invalid_body" });
    expect(parseUpdateThought({ rawText: 1 }, current)).toEqual({ ok: false, error: "invalid_body" });
    expect(parseUpdateThought(null, current)).toEqual({ ok: false, error: "invalid_body" });
  });

  it("本文の長さは記録の kind に従う", () => {
    expect(parseUpdateThought({ rawText: "短い" }, current)).toEqual({ ok: false, error: "too_short" });
    const quick = { ...current, kind: "quick" as const, rawText: "いい風" };
    expect(parseUpdateThought({ rawText: " そよ風 " }, quick)).toEqual({
      ok: true,
      value: { rawText: "そよ風", deepDiveQuestion: "なぜ？", deepDiveAnswer: "" },
    });
    expect(parseUpdateThought({ rawText: "あ".repeat(61) }, quick)).toEqual({ ok: false, error: "too_long" });
  });

  it("あとから深掘りを足せる（質問と答え）", () => {
    const quick = { rawText: "いい風", deepDiveQuestion: "", deepDiveAnswer: "", kind: "quick" as const };
    expect(parseUpdateThought({ deepDiveQuestion: "何が？", deepDiveAnswer: "晴れた" }, quick)).toEqual({
      ok: true,
      value: { rawText: "いい風", deepDiveQuestion: "何が？", deepDiveAnswer: "晴れた" },
    });
  });
});

describe("toThoughtSummary", () => {
  it("embedding を返さず、createdAt を ISO にする", () => {
    const at = new Date("2026-10-24T01:02:03.000Z");
    const s = toThoughtSummary("t1", {
      date: TODAY,
      rawText: "いい風",
      deepDiveQuestion: "",
      deepDiveAnswer: "",
      title: "いい風",
      kind: "quick",
      mood: 1,
      tags: [],
      embedding: [0.1],
      createdAt: { toDate: () => at },
    });
    expect(s).toMatchObject({ id: "t1", kind: "quick", mood: 1, createdAt: at.toISOString() });
    expect(s).not.toHaveProperty("embedding");
  });

  it("旧データ（kind・深掘り・タイトルなし）にも既定値を補う", () => {
    const s = toThoughtSummary("old", { date: "2026-07-01", rawText: "昔の日記です。", event: "旧6項目", mood: 9 });
    expect(s).toMatchObject({
      id: "old",
      kind: "full",
      deepDiveQuestion: "",
      deepDiveAnswer: "",
      title: "昔の日記です",
      event: "旧6項目",
    });
    expect(s).not.toHaveProperty("mood");
    expect(s).not.toHaveProperty("createdAt");
  });
});

describe("toIsoString / sortNewestFirst", () => {
  it("Timestamp・Date・文字列を ISO に", () => {
    expect(toIsoString("2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z");
    expect(toIsoString(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
    expect(toIsoString(null)).toBeUndefined();
  });

  it("新しい順（createdAt なしは後ろ）", () => {
    const base = { date: TODAY, rawText: "", deepDiveQuestion: "", deepDiveAnswer: "", title: "", kind: "full" as const };
    const r = sortNewestFirst([
      { ...base, id: "a", createdAt: "2026-10-24T01:00:00.000Z" },
      { ...base, id: "b" },
      { ...base, id: "c", createdAt: "2026-10-24T03:00:00.000Z" },
    ]);
    expect(r.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
});

describe("formatShapedFields（旧記録の RAG 用）", () => {
  it("6項目を素のラベル付きで連結する", () => {
    const text = formatShapedFields({
      event: "一人で提案した",
      thinking: "緊張した",
      action: "最後まで話した",
      reason: "自分の言葉で話したかった",
      emotion: "前進した手応え",
      values: "やり遂げることを重視しているのかもしれない",
    });
    expect(text).toBe(
      "出来事：一人で提案した\n思考：緊張した\n行動：最後まで話した\n理由：自分の言葉で話したかった\n感情：前進した手応え\n価値観：やり遂げることを重視しているのかもしれない"
    );
  });
});
