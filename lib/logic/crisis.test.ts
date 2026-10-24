import { describe, expect, it } from "vitest";
import { detectCrisis, normalizeForCrisis } from "./crisis";

describe("normalizeForCrisis", () => {
  it("カタカナ・半角・小さい母音・伸ばし棒・空白をならす", () => {
    expect(normalizeForCrisis("シニタイ")).toBe("しにたい");
    expect(normalizeForCrisis("ｼﾆﾀｲ")).toBe("しにたい");
    expect(normalizeForCrisis("死にたぃ")).toBe("死にたい");
    expect(normalizeForCrisis("死に たーい")).toBe("死にたい");
  });
});

describe("detectCrisis：拾う", () => {
  const hits = [
    "死にたい",
    "もう死にたいし、疲れた",
    "しにたい",
    "シニタイ",
    "ｼﾆﾀｲ",
    "死にたくなる夜",
    "しにたくて眠れない",
    "死にたーい",
    "死にたぃ",
    "タヒにたい",
    "死にてぇ",
    "死んでしまいたい",
    "しんじゃいたい",
    "死んだほうがまし",
    "消えたい",
    "きえたい",
    "キエタイ",
    "消えてしまいたい",
    "消えてなくなりたい",
    "いなくなりたい",
    "自殺したい",
    "じさつ",
    "自傷が止まらない",
    "リストカットした",
    "またリスカした",
    "手首を切った",
    "首を吊りたい",
    "飛び降りたい",
    "生きていたくない",
    "生きる意味がない",
    "オーバードーズした",
    "消 え た い",
  ];
  it.each(hits)("%s", (text) => {
    expect(detectCrisis(text)).toBe(true);
  });
});

describe("detectCrisis：拾わない（誤検知しない）", () => {
  const misses = [
    "",
    "今日は楽しかった",
    "忙しくて死にそう",
    "死ぬほど笑った",
    "推しが尊くて死ぬ",
    "事故で死にたくない",
    "わたしにたいして厳しい",
    "わたしにたくさん話してくれた",
    "田中氏にたいしてお礼",
    "学校いきたくない",
    "会社に行きたくない",
    "電気が消えた",
    "消しゴムをなくした",
    "首をつっこむのはやめた",
    "自称プロ",
    "アリスかわいい",
    "プールに飛び込みたい",
    "消えたくないな、この気持ち",
    "生きる意味を考えた",
  ];
  it.each(misses)("%s", (text) => {
    expect(detectCrisis(text)).toBe(false);
  });
});
