import { describe, expect, it } from "vitest";
import { buildProfileText, buildSystemPrompt, DEEPDIVE_APPENDIX } from "./mentorPrompt";
import { emptyProfile } from "@/lib/db/types";

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
  it("プロフィールが空ならユーザーについてセクションごと省略する", () => {
    const prompt = buildSystemPrompt("deepdive", null);
    expect(prompt).not.toContain("# ユーザーについて");
    expect(prompt).not.toContain("{{profile}}");
    expect(prompt).toContain(DEEPDIVE_APPENDIX);
  });

  it("プロフィールがあれば {{profile}} に差し込む", () => {
    const prompt = buildSystemPrompt("deepdive", { ...emptyProfile, nickname: "ゆう" });
    expect(prompt).toContain("# ユーザーについて\nユーザーの呼び名はゆうさん。");
    expect(prompt).not.toContain("{{profile}}");
  });
});
