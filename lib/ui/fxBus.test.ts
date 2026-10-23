import { describe, expect, it, vi } from "vitest";
import { fxBus, type FxEvent } from "./fxBus";

describe("fxBus", () => {
  it("流した出来事が購読者に届き、解除後は届かない", () => {
    const got: FxEvent[] = [];
    const off = fxBus.subscribe((e) => got.push(e));
    fxBus.spin();
    fxBus.preview(2);
    fxBus.burst(4);
    fxBus.clear();
    expect(got).toEqual([
      { type: "spin" },
      { type: "preview", mood: 2 },
      { type: "burst", mood: 4 },
      { type: "clear" },
    ]);
    off();
    fxBus.spin();
    expect(got).toHaveLength(4);
  });

  it("受け手が例外を出しても他の受け手に届く", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const off1 = fxBus.subscribe(bad);
    const off2 = fxBus.subscribe(good);
    fxBus.clear();
    expect(bad).toHaveBeenCalledTimes(1);
    expect(good).toHaveBeenCalledWith({ type: "clear" });
    off1();
    off2();
  });
});
