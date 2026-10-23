// @vitest-environment node
import { describe, expect, it } from "vitest";
import { warnAtFor } from "@/lib/logic/limits";

// hook 自体は DOM が要るため、カウンターが使う閾値の決まり方だけを縛る
describe("useLimitedInput が使う閾値", () => {
  it("一言60・日記5000・相談2000 の warnAt", () => {
    expect(warnAtFor(60)).toBe(54);
    expect(warnAtFor(5000)).toBe(4500);
    expect(warnAtFor(2000)).toBe(1800);
  });
});
