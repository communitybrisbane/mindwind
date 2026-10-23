import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  buildDayEntries,
  decideMoodWrite,
  isTodayOnly,
  MAX_MOOD_CHANGES_PER_DAY,
  parsePutMoodBody,
  readMood,
  readMoodRange,
  writeTodayMood,
} from "./moodStore";

const TODAY = "2026-10-24";

describe("parsePutMoodBody", () => {
  it("0〜4 の整数だけ通す", () => {
    for (const m of [0, 1, 2, 3, 4]) expect(parsePutMoodBody({ mood: m })).toBe(m);
  });
  it("範囲外・小数・文字列・欠落・null は null", () => {
    for (const b of [{ mood: 5 }, { mood: -1 }, { mood: 1.5 }, { mood: "2" }, {}, null, "x", [2]]) {
      expect(parsePutMoodBody(b)).toBeNull();
    }
  });
});

describe("isTodayOnly", () => {
  it("date 省略・今日は可、それ以外は不可", () => {
    expect(isTodayOnly({ mood: 1 }, TODAY)).toBe(true);
    expect(isTodayOnly({ mood: 1, date: TODAY }, TODAY)).toBe(true);
    expect(isTodayOnly({ mood: 1, date: "2026-10-23" }, TODAY)).toBe(false);
    expect(isTodayOnly({ mood: 1, date: "2026-10-25" }, TODAY)).toBe(false);
    expect(isTodayOnly({ mood: 1, date: null }, TODAY)).toBe(false);
  });
});

describe("buildDayEntries", () => {
  it("両端含む・日付順・無い日は null/0 で埋める・同じ日の件数を数える", () => {
    const days = buildDayEntries(
      "2026-10-01",
      "2026-10-04",
      { "2026-10-01": 0, "2026-10-03": 4, "2026-09-30": 2 },
      ["2026-10-01", "2026-10-02", "2026-10-02", "2026-11-01"]
    );
    expect(days).toEqual([
      { date: "2026-10-01", mood: 0, records: 1 },
      { date: "2026-10-02", mood: null, records: 2 },
      { date: "2026-10-03", mood: 4, records: 0 },
      { date: "2026-10-04", mood: null, records: 0 },
    ]);
  });
  it("月をまたぐ・1日だけ", () => {
    expect(buildDayEntries("2026-02-28", "2026-03-01", {}, []).map((d) => d.date)).toEqual([
      "2026-02-28",
      "2026-03-01",
    ]);
    expect(buildDayEntries(TODAY, TODAY, {}, [])).toHaveLength(1);
  });
  it("1年分は 366 件まで", () => {
    expect(buildDayEntries("2025-10-24", TODAY, {}, [])).toHaveLength(366);
  });
});

describe("decideMoodWrite", () => {
  it("初回は書く（changes=1）", () => {
    expect(decideMoodWrite(null, 2)).toEqual({ write: true, changes: 1 });
  });
  it("選び直しは上書きして数える", () => {
    expect(decideMoodWrite({ mood: 2, changes: 1 }, 3)).toEqual({ write: true, changes: 2 });
  });
  it("同じ玉は書かない・数えない", () => {
    expect(decideMoodWrite({ mood: 3, changes: 5 }, 3)).toEqual({ write: false, limited: false });
  });
  it("上限に達したら拒む", () => {
    expect(decideMoodWrite({ mood: 1, changes: MAX_MOOD_CHANGES_PER_DAY }, 2)).toEqual({
      write: false,
      limited: true,
    });
  });
  it("changes が無い・壊れた旧データは 0 とみなす", () => {
    expect(decideMoodWrite({ mood: 1, changes: undefined }, 2)).toEqual({ write: true, changes: 1 });
    expect(decideMoodWrite({ mood: 1, changes: "x" }, 2)).toEqual({ write: true, changes: 1 });
  });
});

/* ---------- Firestore の偽物 ---------- */

type Doc = Record<string, unknown>;

function fakeDb(store: Map<string, Doc>) {
  const snapOf = (path: string) => {
    const data = store.get(path);
    return {
      id: path.split("/").pop()!,
      exists: data !== undefined,
      get: (f: string) => data?.[f],
    };
  };
  type Filter = { field: "id" | string; op: ">=" | "<="; value: string };
  const query = (col: string, filters: Filter[]) => ({
    where: (field: unknown, op: ">=" | "<=", value: string) =>
      query(col, [...filters, { field: typeof field === "string" ? field : "id", op, value }]),
    select: () => query(col, filters),
    get: async () => {
      const docs = [...store.keys()]
        .filter((p) => p.startsWith(`${col}/`) && !p.slice(col.length + 1).includes("/"))
        .map(snapOf)
        .filter((s) =>
          filters.every((f) => {
            const v = f.field === "id" ? s.id : (s.get(f.field) as string);
            return f.op === ">=" ? v >= f.value : v <= f.value;
          })
        );
      return { docs };
    },
  });
  const writes: Array<{ path: string; data: Doc }> = [];
  const db = {
    doc: (path: string) => ({ path, get: async () => snapOf(path) }),
    collection: (col: string) => query(col, []),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        get: async (ref: { path: string }) => snapOf(ref.path),
        set: (ref: { path: string }, data: Doc) => {
          writes.push({ path: ref.path, data });
          store.set(ref.path, data);
        },
      }),
  };
  return { db: db as unknown as Firestore, writes };
}

describe("readMood / writeTodayMood", () => {
  it("無ければ null、保存後はその値、選び直しで上書き", async () => {
    const store = new Map<string, Doc>();
    const { db, writes } = fakeDb(store);
    expect(await readMood(db, "u1", TODAY)).toBeNull();

    const now = new Date("2026-10-24T01:00:00Z");
    expect(await writeTodayMood(db, "u1", TODAY, 1, now)).toEqual({ ok: true });
    expect(await readMood(db, "u1", TODAY)).toBe(1);
    expect(writes[0]).toEqual({ path: `users/u1/moods/${TODAY}`, data: { mood: 1, updatedAt: now, changes: 1 } });

    await writeTodayMood(db, "u1", TODAY, 4, now);
    expect(await readMood(db, "u1", TODAY)).toBe(4);
    expect(store.get(`users/u1/moods/${TODAY}`)?.changes).toBe(2);
  });

  it("同じ玉なら書き込まない", async () => {
    const store = new Map<string, Doc>([[`users/u1/moods/${TODAY}`, { mood: 2, changes: 1 }]]);
    const { db, writes } = fakeDb(store);
    expect(await writeTodayMood(db, "u1", TODAY, 2)).toEqual({ ok: true });
    expect(writes).toHaveLength(0);
  });

  it("上限で daily_limit・値は変わらない", async () => {
    const store = new Map<string, Doc>([
      [`users/u1/moods/${TODAY}`, { mood: 2, changes: MAX_MOOD_CHANGES_PER_DAY }],
    ]);
    const { db } = fakeDb(store);
    expect(await writeTodayMood(db, "u1", TODAY, 3)).toEqual({ ok: false, reason: "daily_limit" });
    expect(await readMood(db, "u1", TODAY)).toBe(2);
  });

  it("不正な保存値は null として読む", async () => {
    const store = new Map<string, Doc>([[`users/u1/moods/${TODAY}`, { mood: 9 }]]);
    expect(await readMood(fakeDb(store).db, "u1", TODAY)).toBeNull();
  });
});

describe("readMoodRange", () => {
  it("範囲内の気分と記録件数だけを日ごとに返す（他人のデータ・範囲外は混ざらない）", async () => {
    const store = new Map<string, Doc>([
      ["users/u1/moods/2026-10-20", { mood: 0 }],
      ["users/u1/moods/2026-10-22", { mood: 3 }],
      ["users/u1/moods/2026-10-19", { mood: 1 }],
      ["users/u1/moods/2026-10-21", { mood: 7 }],
      ["users/u2/moods/2026-10-21", { mood: 4 }],
      ["users/u1/thoughts/a", { date: "2026-10-21", rawText: "x" }],
      ["users/u1/thoughts/b", { date: "2026-10-21", rawText: "y" }],
      ["users/u1/thoughts/c", { date: "2026-10-23", rawText: "z" }],
      ["users/u1/thoughts/d", { date: "2026-10-18", rawText: "w" }],
      ["users/u2/thoughts/e", { date: "2026-10-22", rawText: "v" }],
    ]);
    const days = await readMoodRange(fakeDb(store).db, "u1", "2026-10-20", "2026-10-23");
    expect(days).toEqual([
      { date: "2026-10-20", mood: 0, records: 0 },
      { date: "2026-10-21", mood: null, records: 2 },
      { date: "2026-10-22", mood: 3, records: 0 },
      { date: "2026-10-23", mood: null, records: 1 },
    ]);
  });
});
