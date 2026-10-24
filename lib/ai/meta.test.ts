import { describe, expect, it, vi } from "vitest";
import { buildSystemPrompt, COMMON, META_APPENDIX } from "./mentorPrompt";
import {
  buildMetaInput,
  dateWithWeekday,
  generateMeta,
  metaLimitFor,
  validateMeta,
  type MetaCaller,
  type MetaSource,
} from "./meta";

const src: MetaSource = {
  date: "2026-10-20",
  rawText: "会議で発言できなかった。\n悔しい。",
  deepDiveQuestion: "いま、どんな気持ち？",
  deepDiveAnswer: "少しだけ話せた",
};

describe("dateWithWeekday", () => {
  it("曜日を添える（暦日。タイムゾーンに左右されない）", () => {
    expect(dateWithWeekday("2026-10-20")).toBe("2026-10-20（火）");
    expect(dateWithWeekday("2026-10-25")).toBe("2026-10-25（日）");
  });
});

describe("buildMetaInput", () => {
  it("本文と Q/A をそのまま入れる（本人の言葉を書き換えない）", () => {
    expect(buildMetaInput(src)).toBe(
      "【記録】2026-10-20（火）\n本文：\n会議で発言できなかった。\n悔しい。\n\nQ（メンターの質問）：いま、どんな気持ち？\nA（本人の答え）：少しだけ話せた"
    );
  });

  it("深掘りの答えが無ければ Q/A の行ごと省く", () => {
    expect(buildMetaInput({ ...src, deepDiveAnswer: "  " })).toBe(
      "【記録】2026-10-20（火）\n本文：\n会議で発言できなかった。\n悔しい。"
    );
  });

  it("質問が無ければ A だけ", () => {
    expect(buildMetaInput({ ...src, deepDiveQuestion: "" })).toContain("\n\nA（本人の答え）：少しだけ話せた");
    expect(buildMetaInput({ ...src, deepDiveQuestion: "" })).not.toContain("Q（");
  });
});

describe("システムプロンプト", () => {
  it("共通部（セーフティ入り）＋META_APPENDIX をそのまま使い、profile は入らない", () => {
    const system = buildSystemPrompt("meta", { nickname: "ゆう" } as never);
    expect(system.endsWith(META_APPENDIX)).toBe(true);
    expect(system).toContain("# セーフティ");
    expect(system).not.toContain("ゆう");
    expect(system).not.toContain("# ユーザーについて");
    expect(system.startsWith(COMMON.split("\n")[0])).toBe(true);
  });
});

describe("validateMeta", () => {
  it("形に合う1行は通す（前後の空白だけ除く）", () => {
    expect(validateMeta(" 出来事：会議で発言できなかった／感情：悔しい／場面：仕事\n")).toBe(
      "出来事：会議で発言できなかった／感情：悔しい／場面：仕事"
    );
  });

  it("形が違う・複数行・長すぎるものは捨てる", () => {
    expect(validateMeta("会議で発言できなかった")).toBeNull();
    expect(validateMeta("出来事：会議／感情：悔しい\n場面：仕事")).toBeNull();
    expect(validateMeta("メモ：出来事：会議／感情：悔しい／場面：仕事\n補足")).toBeNull();
    expect(validateMeta(`出来事：${"あ".repeat(80)}／感情：悔しい／場面：仕事`)).toBeNull();
    expect(validateMeta("")).toBeNull();
  });

  it("窓口の案内（電話番号・窓口名）が混ざったら捨てる", () => {
    expect(validateMeta("出来事：つらい／感情：記載なし／場面：0570-783-556")).toBeNull();
    expect(validateMeta("出来事：いのちの電話／感情：記載なし／場面：その他")).toBeNull();
    expect(validateMeta("出来事：０１２０－２７９－３３８／感情：記載なし／場面：その他")).toBeNull();
  });
});

describe("metaLimitFor", () => {
  it("会員は記録上限の3倍、ゲストはその 1/10", () => {
    expect(metaLimitFor(false)).toBe(90);
    expect(metaLimitFor(true)).toBe(9);
  });
});

describe("generateMeta", () => {
  const good = "出来事：会議で発言できなかった／感情：悔しい／場面：仕事";

  it("1回で通れば返す。可変の記録は user に入る", async () => {
    const call = vi.fn<MetaCaller>().mockResolvedValue({ stopReason: "end_turn", text: good });
    const out = await generateMeta("SYS", src, call);
    expect(out).toEqual({ ok: true, meta: good, attempts: 1 });
    expect(call).toHaveBeenCalledWith("SYS", buildMetaInput(src));
  });

  it("失敗したら1回だけやり直す", async () => {
    const call = vi
      .fn<MetaCaller>()
      .mockRejectedValueOnce(new Error("overloaded"))
      .mockResolvedValueOnce({ stopReason: "end_turn", text: good });
    const out = await generateMeta("SYS", src, call);
    expect(out).toEqual({ ok: true, meta: good, attempts: 2 });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("2回とも失敗したら捨てる（再試行は1回まで）", async () => {
    const call = vi.fn<MetaCaller>().mockRejectedValue(new Error("down"));
    const out = await generateMeta("SYS", src, call);
    expect(out).toEqual({ ok: false, reason: "error", attempts: 2, called: false });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("max_tokens で止まったら捨てる（やり直しても同じなら失敗）", async () => {
    const call = vi.fn<MetaCaller>().mockResolvedValue({ stopReason: "max_tokens", text: good });
    const out = await generateMeta("SYS", src, call);
    expect(out).toMatchObject({ ok: false, reason: "incomplete", called: true });
  });

  it("refusal はやり直さずに捨てる", async () => {
    const call = vi.fn<MetaCaller>().mockResolvedValue({ stopReason: "refusal", text: "" });
    const out = await generateMeta("SYS", src, call);
    expect(out).toMatchObject({ ok: false, reason: "refusal", attempts: 1 });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("窓口の案内が返ってきたらメモにしない", async () => {
    const call = vi.fn<MetaCaller>().mockResolvedValue({
      stopReason: "end_turn",
      text: "書いてくれてありがとう。いのちの電話 0570-783-556 に相談してみて。",
    });
    const out = await generateMeta("SYS", src, call);
    expect(out).toMatchObject({ ok: false, reason: "invalid", called: true });
  });
});
