import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildProfileText,
  buildSystemPrompt,
  COMMON,
  CONSULT_APPENDIX,
  DEEPDIVE_APPENDIX,
  LETTER_APPENDIX,
  META_APPENDIX,
  SHAPING_APPENDIX,
  type PromptKind,
} from "./mentorPrompt";
import { emptyProfile } from "@/lib/db/types";

// docs/mentor-prompt.md「メンタープロンプト（実文・コピーして使用）」が正。
// 見出し（### …）の直後にある最初の ``` ブロックの中身を、空白も含めてそのまま取り出す。
const DOC_PATH = resolve(__dirname, "../../docs/mentor-prompt.md");
const doc = readFileSync(DOC_PATH, "utf8");

function docBlock(headingPrefix: string): string {
  const lines = doc.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`### ${headingPrefix}`));
  if (start < 0) throw new Error(`見出しが見つからない: ${headingPrefix}`);
  const open = lines.findIndex((l, i) => i > start && l === "```");
  if (open < 0) throw new Error(`コードブロックが見つからない: ${headingPrefix}`);
  const close = lines.findIndex((l, i) => i > open && l === "```");
  if (close < 0) throw new Error(`コードブロックが閉じていない: ${headingPrefix}`);
  return lines.slice(open + 1, close).join("\n");
}

const SAFETY_HEADING = "# セーフティ";
const SAFETY_LINE =
  "自傷や強い希死念慮など深刻な内容が書かれた場合は、分析やアドバイスをやめ、共感的に受け止めた上で、専門の相談窓口（いのちの電話 0570-783-556、よりそいホットライン 0120-279-338）を必ず案内する。";

describe("docs/mentor-prompt.md の実文との一致（空白も含めて一字も変えない）", () => {
  it("共通部", () => {
    expect(COMMON).toBe(docBlock("共通部"));
  });

  it("深掘り用の追記", () => {
    expect(DEEPDIVE_APPENDIX).toBe(docBlock("深掘り用の追記"));
  });

  it("検索用メタの生成用の追記", () => {
    expect(META_APPENDIX).toBe(docBlock("検索用メタの生成用の追記"));
  });

  it("成形用の追記（廃止・記録として残す）", () => {
    expect(SHAPING_APPENDIX).toBe(docBlock("成形用の追記"));
  });

  it("相談用の追記", () => {
    expect(CONSULT_APPENDIX).toBe(docBlock("相談用の追記"));
  });

  it("週の手紙用の追記", () => {
    expect(LETTER_APPENDIX).toBe(docBlock("週の手紙用の追記"));
  });

  it("ドキュメント側のセーフティ文がテストの期待値と同じ（期待値の腐りを防ぐ）", () => {
    expect(docBlock("共通部")).toContain(`${SAFETY_HEADING}\n${SAFETY_LINE}`);
  });
});

describe("buildProfileText", () => {
  it("全項目入力時はドキュメントの例文と同じ形になる", () => {
    expect(
      buildProfileText({
        nickname: "ゆう",
        activity: "法人営業",
        stage: "year1",
        goal: "仕事に早く慣れたい",
      })
    ).toBe("ユーザーの呼び名はゆうさん。法人営業の社会人1年目で、仕事に早く慣れたいと思っている。");
  });

  it("未入力の項目は文に含めない", () => {
    expect(buildProfileText({ ...emptyProfile, nickname: "ゆう" })).toBe(
      "ユーザーの呼び名はゆうさん。"
    );
    expect(buildProfileText({ ...emptyProfile, stage: "student" })).toBe("学生。");
    expect(buildProfileText({ ...emptyProfile, activity: "大学院の研究" })).toBe(
      "大学院の研究をしている。"
    );
  });

  it("全項目未設定なら空文字", () => {
    expect(buildProfileText(emptyProfile)).toBe("");
    expect(buildProfileText(null)).toBe("");
  });
});

describe("buildSystemPrompt", () => {
  const kinds: PromptKind[] = ["deepdive", "consult", "meta", "letter"];
  const appendixOf: Record<PromptKind, string> = {
    deepdive: DEEPDIVE_APPENDIX,
    meta: META_APPENDIX,
    shaping: SHAPING_APPENDIX,
    consult: CONSULT_APPENDIX,
    letter: LETTER_APPENDIX,
  };
  const fullProfile = {
    nickname: "ゆう",
    activity: "法人営業",
    stage: "year1" as const,
    goal: "仕事に早く慣れたい",
  };

  it.each(kinds)("%s：共通部のセーフティが入り、共通部で始まり追記で終わる", (kind) => {
    for (const profile of [null, fullProfile]) {
      const prompt = buildSystemPrompt(kind, profile);
      expect(prompt).toContain(`${SAFETY_HEADING}\n${SAFETY_LINE}`);
      expect(prompt.startsWith("あなたは「MindWind」のAIメンター。")).toBe(true);
      expect(prompt.endsWith(`\n\n${appendixOf[kind]}`)).toBe(true);
      expect(prompt).not.toContain("{{profile}}");
      // 共通部の各見出しが残っている（セーフティが別の追記で置き換わっていない）
      for (const h of ["# あなたの立場", "# 振る舞いの原則", "# 口調", "# やらないこと"]) {
        expect(prompt).toContain(h);
      }
    }
  });

  it("プロフィールが空ならユーザーについてセクションごと省略する", () => {
    for (const kind of ["deepdive", "consult", "letter"] as const) {
      const prompt = buildSystemPrompt(kind, null);
      expect(prompt).not.toContain("# ユーザーについて");
      expect(prompt).not.toContain("{{profile}}");
      expect(prompt).toBe(
        `${COMMON.replace("\n\n# ユーザーについて\n{{profile}}", "")}\n\n${appendixOf[kind]}`
      );
      expect(buildSystemPrompt(kind, emptyProfile)).toBe(prompt);
    }
  });

  it("プロフィールがあれば {{profile}} に差し込む（深掘り・相談・手紙）", () => {
    for (const kind of ["deepdive", "consult", "letter"] as const) {
      const prompt = buildSystemPrompt(kind, { ...emptyProfile, nickname: "ゆう" });
      expect(prompt).toContain("# ユーザーについて\nユーザーの呼び名はゆうさん。");
      expect(prompt).not.toContain("{{profile}}");

      const full = buildSystemPrompt(kind, fullProfile);
      expect(full).toBe(
        `${COMMON.replace("{{profile}}", buildProfileText(fullProfile))}\n\n${appendixOf[kind]}`
      );
    }
  });

  it("meta は {{profile}} を渡さず、プロフィールがあってもセクションごと省略する", () => {
    const withProfile = buildSystemPrompt("meta", fullProfile);
    const without = buildSystemPrompt("meta", null);
    expect(withProfile).toBe(without);
    expect(withProfile).not.toContain("# ユーザーについて");
    expect(withProfile).not.toContain("ゆう");
    expect(withProfile).toBe(
      `${COMMON.replace("\n\n# ユーザーについて\n{{profile}}", "")}\n\n${META_APPENDIX}`
    );
  });

  it("手紙の追記は共通部のセーフティを優先すると明記している", () => {
    const prompt = buildSystemPrompt("letter", null);
    expect(prompt).toContain("共通部のセーフティが、この追記より優先する。");
    // 共通部のセーフティ（窓口つき）が、手紙の追記のセーフティより前にある
    expect(prompt.indexOf(SAFETY_LINE)).toBeLessThan(
      prompt.indexOf("共通部のセーフティが、この追記より優先する。")
    );
  });
});
