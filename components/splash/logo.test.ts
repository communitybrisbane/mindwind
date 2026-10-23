import { describe, expect, it } from "vitest";
import { LOGO_LETTERS, LOGO_ORIGIN, LOGO_REVEAL, LOGO_SCALE, LOGO_VIEWBOX } from "./logo";

/** M/L/Q/H/V/Z だけのパスの、制御点を含む外接矩形（フォント座標） */
function pathBounds(d: string) {
  const tokens = d.match(/[MLQHVZ]|-?\d*\.?\d+/gi) ?? [];
  let cmd = "M";
  let x = 0;
  let y = 0;
  const xs: number[] = [];
  const ys: number[] = [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Z]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === "Z") continue;
    if (cmd === "H") x = num();
    else if (cmd === "V") y = num();
    else if (cmd === "Q") {
      xs.push(num());
      ys.push(num());
      x = num();
      y = num();
    } else {
      x = num();
      y = num();
    }
    xs.push(x);
    ys.push(y);
  }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function logoBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const l of LOGO_LETTERS) {
    const b = pathBounds(l.d);
    minX = Math.min(minX, l.x + b.minX);
    maxX = Math.max(maxX, l.x + b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }
  const sx = (fx: number) => LOGO_ORIGIN.x + fx * LOGO_SCALE;
  return {
    left: sx(minX),
    right: sx(maxX),
    // 「mind」は y を反転（上向き）、鏡像は下向き
    top: LOGO_ORIGIN.mindBaseline - maxY * LOGO_SCALE,
    bottom: LOGO_ORIGIN.windBaseline + maxY * LOGO_SCALE,
  };
}

describe("起動画面のロゴ", () => {
  it("m・i・n・d の4文字", () => {
    expect(LOGO_LETTERS).toHaveLength(4);
  });

  it("切り出す枠が、文字の外形より四方に 30 以上の余白を持つ（d の右端・上下が欠けない）", () => {
    const b = logoBounds();
    const vb = LOGO_VIEWBOX;
    expect(b.left - vb.x).toBeGreaterThanOrEqual(30);
    expect(vb.x + vb.width - b.right).toBeGreaterThanOrEqual(30);
    expect(b.top - vb.y).toBeGreaterThanOrEqual(30);
    expect(vb.y + vb.height - b.bottom).toBeGreaterThanOrEqual(30);
  });

  it("鏡像を見せる範囲は2本の基準線の間から始まる", () => {
    expect(LOGO_REVEAL.y).toBeGreaterThan(LOGO_ORIGIN.mindBaseline);
    expect(LOGO_REVEAL.y).toBeLessThan(LOGO_ORIGIN.windBaseline);
  });
});
