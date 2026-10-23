import { describe, expect, it } from "vitest";
import { pickReunion } from "./reunion";

const T = (id: string, date: string) => ({ id, date });
const today = "2026-10-25";
const filler = [T("a", "2026-10-01"), T("b", "2026-10-02"), T("c", "2026-10-03"), T("d", "2026-10-04")];

describe("pickReunion", () => {
  it("記録が5件未満なら null", () => {
    expect(pickReunion([T("1", "2026-10-18"), ...filler.slice(0, 3)], today, null)).toBeNull();
  });
  it("7日前を選ぶ", () => {
    const r = pickReunion([T("w", "2026-10-18"), ...filler, T("x", "2026-09-25")], today, null);
    expect(r?.thought.id).toBe("w");
    expect(r?.label).toBe("1週間前のあなた");
  });
  it("±1日も可。ちょうどの日を優先", () => {
    const r1 = pickReunion([T("w", "2026-10-17"), ...filler, T("z", "2026-09-01")], today, null);
    expect(r1?.thought.id).toBe("w");
    const r2 = pickReunion([T("w1", "2026-10-17"), T("w0", "2026-10-18"), ...filler], today, null);
    expect(r2?.thought.id).toBe("w0");
  });
  it("7日前が無ければ30日前", () => {
    const r = pickReunion([T("m", "2026-09-25"), ...filler, T("o", "2026-08-01")], today, null);
    expect(r?.label).toBe("1か月前のあなた");
    expect(r?.thought.id).toBe("m");
  });
  it("どちらも無ければ最初に書いた日", () => {
    const r = pickReunion([T("o", "2026-08-01"), ...filler], today, null);
    expect(r?.label).toBe("最初に書いた日のあなた");
    expect(r?.thought.id).toBe("o");
  });
  it("同じ記録を続けて出さない（次の候補へ）", () => {
    const list = [T("w", "2026-10-18"), T("m", "2026-09-25"), ...filler];
    expect(pickReunion(list, today, "w")?.thought.id).toBe("m");
  });
  it("他に候補が無ければ null", () => {
    const list = [T("o", "2026-08-01"), T("p", "2026-10-25"), T("q", "2026-10-25"), T("r", "2026-10-25"), T("s", "2026-10-25")];
    expect(pickReunion(list, today, "o")).toBeNull();
  });
  it("今日だけの記録しか無ければ null", () => {
    const list = ["1", "2", "3", "4", "5"].map((i) => T(i, today));
    expect(pickReunion(list, today, null)).toBeNull();
  });
  it("本人の記録オブジェクトをそのまま返す", () => {
    const w = { id: "w", date: "2026-10-18", title: "t", text: "原文" };
    const r = pickReunion([w, ...filler.map((f) => ({ ...f, title: "", text: "" })), ], today, null);
    expect(r?.thought).toBe(w);
  });
  it("月またぎ・年またぎの日付計算", () => {
    const r = pickReunion([T("w", "2025-12-31"), ...filler.map((f, i) => T(f.id, `2025-11-0${i + 1}`)), T("y", "2025-11-30")], "2026-01-07", null);
    expect(r?.thought.id).toBe("w");
  });
});
