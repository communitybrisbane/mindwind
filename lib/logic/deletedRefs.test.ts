import { describe, expect, it } from "vitest";
import { scrubChatRefs, scrubLetterRefs } from "./deletedRefs";

describe("scrubChatRefs", () => {
  it("一致した要素だけ id と日付を残して伏せる（新形式・旧6項目とも）", () => {
    const refs = [
      { id: "a", date: "2026-10-20", title: "題", quote: "本人の言葉" },
      { id: "b", date: "2026-10-21", title: "題2", event: "出来事", thinking: "思考" },
    ];
    const out = scrubChatRefs(refs, "b");
    expect(out.changed).toBe(true);
    expect(out.refs).toEqual([refs[0], { id: "b", date: "2026-10-21", deleted: true }]);
    // 元の配列は変えない
    expect(refs[1]).toHaveProperty("event");
  });

  it("一致しなければ changed: false。配列でなければ空", () => {
    expect(scrubChatRefs([{ id: "a", date: "d" }], "zzz").changed).toBe(false);
    expect(scrubChatRefs(undefined, "a")).toEqual({ changed: false, refs: [] });
  });

  it("すでに伏せた要素はもう一度数えない（冪等）", () => {
    const once = scrubChatRefs([{ id: "a", date: "d", quote: "x" }], "a");
    const twice = scrubChatRefs(once.refs, "a");
    expect(twice.changed).toBe(false);
  });
});

describe("scrubLetterRefs", () => {
  it("thoughtId が一致したら quote を空にして deleted: true。手紙の並びは変えない", () => {
    const out = scrubLetterRefs(
      [
        { thoughtId: "a", date: "2026-10-20", quote: "言えなかった。" },
        { thoughtId: "b", date: "2026-10-23", quote: "少し話せた。" },
      ],
      "a"
    );
    expect(out.changed).toBe(true);
    expect(out.refs[0]).toEqual({ thoughtId: "a", date: "2026-10-20", quote: "", deleted: true });
    expect(out.refs[1]).toEqual({ thoughtId: "b", date: "2026-10-23", quote: "少し話せた。" });
  });
});
