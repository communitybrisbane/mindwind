import { describe, expect, it } from "vitest";
import { AUTO_NAMES, autoNameFor, displayNameFor, fnv1a32 } from "./autoName";

describe("fnv1a32", () => {
  it("既知の値と一致する", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });
});

describe("AUTO_NAMES", () => {
  it("9つで重複がない", () => {
    expect(AUTO_NAMES).toHaveLength(9);
    expect(new Set(AUTO_NAMES).size).toBe(9);
  });

  it("風の強さ・向きを表す言葉を含まない", () => {
    const banned = ["そよ", "疾", "嵐", "凪", "東風", "西風", "南風", "北風", "強", "弱", "追い風", "向かい風", "つむじ"];
    for (const name of AUTO_NAMES) {
      for (const w of banned) expect(name).not.toContain(w);
    }
  });
});

describe("autoNameFor", () => {
  it("同じ uid はいつも同じ名前", () => {
    const uid = "abcDEF123xyz";
    expect(autoNameFor(uid)).toBe(autoNameFor(uid));
  });

  it("fnv1a32 % 9 の位置の名前を返す", () => {
    const uid = "Zq9fK2LmP0aBcDeFgHiJ";
    expect(autoNameFor(uid)).toBe(AUTO_NAMES[fnv1a32(uid) % 9]);
  });

  it("多くの uid で9つすべてが使われる", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(autoNameFor(`uid-${i}`));
    expect(seen.size).toBe(9);
  });

  it("「さん」は付けない", () => {
    expect(autoNameFor("x")).not.toMatch(/さん$/);
  });
});

describe("displayNameFor", () => {
  it("呼び名があればそれに「さん」", () => {
    expect(displayNameFor("ゆう", "u1")).toBe("ゆうさん");
  });

  it("前後の空白は取る", () => {
    expect(displayNameFor("  ゆう ", "u1")).toBe("ゆうさん");
  });

  it("空・空白だけ・未定義なら自動の呼び名", () => {
    const auto = `${autoNameFor("u1")}さん`;
    expect(displayNameFor("", "u1")).toBe(auto);
    expect(displayNameFor("   ", "u1")).toBe(auto);
    expect(displayNameFor(undefined, "u1")).toBe(auto);
    expect(displayNameFor(null, "u1")).toBe(auto);
  });
});
