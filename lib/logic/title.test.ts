import { describe, expect, it } from "vitest";
import { autoTitle } from "./title";

describe("autoTitle", () => {
  it("先頭の一文を 。！？改行 で区切って trim", () => {
    expect(autoTitle("  今日は雨。でも楽しかった")).toBe("今日は雨");
    expect(autoTitle("やった！次も")).toBe("やった");
    expect(autoTitle("一行目\n二行目")).toBe("一行目");
  });

  it("20文字ちょうどで切り、「…」は付けない", () => {
    const t = autoTitle("あいうえおかきくけこさしすせそたちつてとなにぬねの。");
    expect(t).toBe("あいうえおかきくけこさしすせそたちつてと");
    expect(Array.from(t)).toHaveLength(20);
  });

  it("先頭が空なら次の空でない一文。何も無ければ空文字", () => {
    expect(autoTitle("\n\n。本文")).toBe("本文");
    expect(autoTitle("  \n ")).toBe("");
  });
});
