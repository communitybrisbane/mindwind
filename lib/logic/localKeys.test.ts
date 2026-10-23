import { describe, expect, it } from "vitest";
import { isPersonalLocalKey, isPersonalSessionKey, selectKeysToClear } from "./localKeys";

describe("isPersonalLocalKey", () => {
  it("下書き・再会カード・回転盤の印・赤い点の印は消す", () => {
    for (const k of [
      "mindwind:draft:today:2026-10-24",
      "mindwind:draft:past:2026-10-01",
      "mindwind:reunion:2026-10-24",
      "mindwind:moodPromptedOn",
      "mindwind:nudgeDismissedOn",
      "mindwind:home:weekCount",
    ]) {
      expect(isPersonalLocalKey(k), k).toBe(true);
    }
  });
  it("端末の好み（音・振動・動きをへらす）と他アプリのキーは残す", () => {
    expect(isPersonalLocalKey("mindwind:prefs")).toBe(false);
    expect(isPersonalLocalKey("other:draft")).toBe(false);
    expect(isPersonalLocalKey("")).toBe(false);
  });
});

describe("selectKeysToClear", () => {
  it("null を飛ばし、判定が真のものだけ", () => {
    expect(selectKeysToClear(["mindwind:draft:x", null, "mindwind:prefs", "foo"], isPersonalLocalKey)).toEqual([
      "mindwind:draft:x",
    ]);
    expect(selectKeysToClear(["mindwind-toast", "mindwind:flyMood", "x"], isPersonalSessionKey)).toEqual([
      "mindwind-toast",
      "mindwind:flyMood",
    ]);
  });
});
