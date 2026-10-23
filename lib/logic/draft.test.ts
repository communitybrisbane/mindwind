import { describe, expect, it, vi } from "vitest";
import {
  createDebouncedSaver,
  draftKey,
  isDraftEmpty,
  parseDraft,
  serializeDraft,
  type DraftData,
} from "./draft";

const d: DraftData = { rawText: "今日は疲れた", deepDiveQuestion: "何が？", deepDiveAnswer: "", step: 1, savedAt: 1 };

describe("draftKey", () => {
  it("今日と過去日は別キー", () => {
    expect(draftKey("today", "2026-10-25")).toBe("mindwind:draft:today:2026-10-25");
    expect(draftKey("past", "2026-10-20")).toBe("mindwind:draft:past:2026-10-20");
    expect(draftKey("today", "2026-10-20")).not.toBe(draftKey("past", "2026-10-20"));
  });
});

describe("isDraftEmpty", () => {
  it("空白だけは空", () => {
    expect(isDraftEmpty({ rawText: " \n", deepDiveAnswer: "" })).toBe(true);
    expect(isDraftEmpty({ rawText: "", deepDiveAnswer: "あ" })).toBe(false);
  });
});

describe("parseDraft", () => {
  it("往復できる", () => expect(parseDraft(serializeDraft(d))).toEqual(d));
  it("null・壊れた JSON・形違いは null", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("{")).toBeNull();
    expect(parseDraft("123")).toBeNull();
    expect(parseDraft(JSON.stringify({ ...d, step: 3 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ ...d, rawText: 1 }))).toBeNull();
  });
});

describe("createDebouncedSaver", () => {
  it("最後の値だけ 500ms 後に保存", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const s = createDebouncedSaver<string>(run);
    s.call("a");
    vi.advanceTimersByTime(300);
    s.call("b");
    vi.advanceTimersByTime(499);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });
  it("flush は即実行、cancel は捨てる", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const s = createDebouncedSaver<string>(run);
    s.call("a");
    s.flush();
    expect(run).toHaveBeenCalledWith("a");
    s.call("b");
    s.cancel();
    vi.advanceTimersByTime(1000);
    expect(run).toHaveBeenCalledTimes(1);
    s.flush();
    expect(run).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
