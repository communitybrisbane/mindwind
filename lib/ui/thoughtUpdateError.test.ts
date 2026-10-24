// @vitest-environment node
import { describe, expect, it } from "vitest";
import { thoughtUpdateErrorMessage } from "./thoughtUpdateError";

const CONFLICT = "別の画面で先にこの記録が直されたみたい。開き直してから、もう一度試してね。";
const NOT_FOUND = "この記録は見つかりませんでした。";
const FAILED = "保存できませんでした。少し待ってからもう一度試してください。";

// 元: ThoughtModal は too_short → conflict → 404 → 既定、QuickDeepDive は conflict → too_long → 404 → 既定
describe("thoughtUpdateErrorMessage", () => {
  const modal = { too_short: "短い" };
  const deep = { too_long: "答えは5000文字までだよ" };

  it("競合は両方とも同じ文言", () => {
    expect(thoughtUpdateErrorMessage(409, { error: "conflict" }, modal)).toBe(CONFLICT);
    expect(thoughtUpdateErrorMessage(409, { error: "conflict" }, deep)).toBe(CONFLICT);
  });
  it("呼び出し側だけのコードはその文言", () => {
    expect(thoughtUpdateErrorMessage(400, { error: "too_short" }, modal)).toBe("短い");
    expect(thoughtUpdateErrorMessage(400, { error: "too_long" }, deep)).toBe("答えは5000文字までだよ");
  });
  it("相手のコードは自分の文言にならず、既定に落ちる", () => {
    expect(thoughtUpdateErrorMessage(400, { error: "too_long" }, modal)).toBe(FAILED);
    expect(thoughtUpdateErrorMessage(400, { error: "too_short" }, deep)).toBe(FAILED);
  });
  it("404 は見つからない、本文が読めなくても", () => {
    expect(thoughtUpdateErrorMessage(404, null, modal)).toBe(NOT_FOUND);
    expect(thoughtUpdateErrorMessage(404, null, deep)).toBe(NOT_FOUND);
  });
  it("自分のコードは 404 より先（元の順番）", () => {
    expect(thoughtUpdateErrorMessage(404, { error: "too_short" }, modal)).toBe("短い");
  });
  it("競合は 404 より先（元の順番）", () => {
    expect(thoughtUpdateErrorMessage(404, { error: "conflict" }, deep)).toBe(CONFLICT);
  });
  it("それ以外・本文なしは保存失敗", () => {
    expect(thoughtUpdateErrorMessage(500, null, modal)).toBe(FAILED);
    expect(thoughtUpdateErrorMessage(500, null, {})).toBe(FAILED);
  });
});
