import { describe, expect, it } from "vitest";
import {
  INITIAL_WHEEL,
  MAX_VELOCITY,
  RADIUS,
  SLOTS,
  SLOT_DEG,
  beadPose,
  centerIndex,
  dragDelta,
  moodOfSlot,
  nearestBead,
  normDeg,
  reelBlur,
  reelPosition,
  release,
  releaseVelocity,
  snapTarget,
  stepInertia,
  stepSnap,
  stepWheel,
  tapAction,
  type WheelState,
} from "./wheelPhysics";

describe("normDeg", () => {
  it("-180〜180 に畳む", () => {
    expect(normDeg(0)).toBe(0);
    expect(normDeg(190)).toBe(-170);
    expect(normDeg(-190)).toBe(170);
    expect(normDeg(720 + 30)).toBe(30);
  });
});

describe("centerIndex / moodOfSlot", () => {
  it("θ=0 では玉0が真ん中", () => {
    expect(centerIndex(0)).toBe(0);
  });
  it("盤を左へ1スロット回す（θ=-24）と玉1が真ん中", () => {
    expect(centerIndex(-SLOT_DEG)).toBe(1);
  });
  it("右へ回すと最後の玉から戻る", () => {
    expect(centerIndex(SLOT_DEG)).toBe(SLOTS - 1);
  });
  it("半分を超えたら次の玉", () => {
    expect(centerIndex(-SLOT_DEG * 0.6)).toBe(1);
    expect(centerIndex(-SLOT_DEG * 0.4)).toBe(0);
  });
  it("15スロットは5つの気分の3周", () => {
    expect([0, 4, 5, 9, 14].map(moodOfSlot)).toEqual([0, 4, 0, 4, 4]);
    expect(moodOfSlot(-1)).toBe(4);
  });
});

describe("snapTarget", () => {
  it("いちばん近いスロットへ", () => {
    expect(snapTarget(10)).toBe(0);
    expect(snapTarget(13)).toBe(24);
    expect(snapTarget(-37)).toBe(-48);
    expect(Object.is(snapTarget(-5), 0)).toBe(true);
  });
});

describe("dragDelta / releaseVelocity", () => {
  it("半径ぶん動かすと約 67.6 度", () => {
    expect(dragDelta(RADIUS)).toBeCloseTo((180 / Math.PI) * 1.18, 6);
  });
  it("サンプルが1つなら速度0", () => {
    expect(releaseVelocity([{ x: 0, t: 0 }])).toBe(0);
  });
  it("最初と最後のサンプルから速度を出す", () => {
    const v = releaseVelocity([
      { x: 0, t: 0 },
      { x: 50, t: 50 },
      { x: 100, t: 100 },
    ]);
    expect(v).toBeCloseTo(dragDelta(100) / 100, 6);
  });
  it("強く弾いても上限に収める", () => {
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 2000, t: 10 }])).toBe(MAX_VELOCITY);
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: -2000, t: 10 }])).toBe(-MAX_VELOCITY);
  });
  it("時間差0でも割り算で壊れない", () => {
    expect(Number.isFinite(releaseVelocity([{ x: 0, t: 5 }, { x: 10, t: 5 }]))).toBe(true);
  });
});

describe("release", () => {
  it("弾いたら慣性", () => {
    expect(release(5, 0.5)).toEqual({ theta: 5, vel: 0.5, mode: "inertia", target: 0 });
  });
  it("そっと離したらスナップ", () => {
    expect(release(14, 0.01)).toEqual({ theta: 14, vel: 0, mode: "snap", target: 24 });
  });
});

describe("stepInertia / stepSnap", () => {
  it("慣性は進みながら減速する", () => {
    const r = stepInertia(0, 1, 16);
    expect(r.theta).toBe(16);
    expect(r.vel).toBeLessThan(1);
    expect(r.vel).toBeCloseTo(Math.exp(-16 / 430), 9);
  });
  it("スナップは目標に寄り、近づいたらぴったり止まる", () => {
    const a = stepSnap(0, 24, 16);
    expect(a.theta).toBeGreaterThan(0);
    expect(a.theta).toBeLessThan(24);
    expect(a.done).toBe(false);
    expect(stepSnap(23.99, 24, 16)).toEqual({ theta: 24, done: true });
  });
  it("dt が時定数以上なら一気に目標へ", () => {
    expect(stepSnap(0, 24, 200)).toEqual({ theta: 24, done: true });
  });
});

describe("stepWheel", () => {
  it("弾いた盤は、いずれスロットにぴったり止まり、止まった合図を1回出す", () => {
    let s: WheelState = { theta: 0, vel: 0.55, mode: "inertia", target: 0 };
    let stops = 0;
    for (let i = 0; i < 2000 && s.mode !== "idle"; i++) {
      const r = stepWheel(s, 16);
      if (r.stopped) stops++;
      s = r.state;
    }
    expect(s.mode).toBe("idle");
    expect(stops).toBe(1);
    expect(s.vel).toBe(0);
    expect(Math.abs(s.theta / SLOT_DEG - Math.round(s.theta / SLOT_DEG))).toBeLessThan(1e-9);
    // 0.55 deg/ms で弾くと 1周弱（τ=430 なら約 236 度）進む
    expect(s.theta).toBeGreaterThan(200);
    expect(s.theta).toBeLessThan(280);
  });
  it("大きな dt は切り詰める（タブ復帰で飛ばない）", () => {
    const r = stepWheel({ theta: 0, vel: 1, mode: "inertia", target: 0 }, 5000);
    expect(r.state.theta).toBe(40);
  });
  it("idle と drag は何もしない", () => {
    expect(stepWheel(INITIAL_WHEEL, 16).state).toBe(INITIAL_WHEEL);
    const d: WheelState = { theta: 3, vel: 0, mode: "drag", target: 0 };
    expect(stepWheel(d, 16).state).toBe(d);
  });
});

describe("beadPose", () => {
  it("真ん中の玉は真上・1.5倍・傾きなし", () => {
    const p = beadPose(0, 0);
    expect(p.phi).toBe(0);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(-RADIUS, 9);
    expect(p.scale).toBeCloseTo(1.5, 9);
    expect(p.rotate).toBe(0);
    expect(p.visible).toBe(true);
    expect(p.zIndex).toBe(100);
  });
  it("隣の玉は右にあり、ほとんど膨らまない", () => {
    const p = beadPose(1, 0);
    expect(p.phi).toBe(SLOT_DEG);
    expect(p.x).toBeGreaterThan(0);
    expect(p.scale).toBeGreaterThan(1);
    expect(p.scale).toBeLessThan(1.1);
  });
  it("70度より外（72度の玉）は見せない", () => {
    expect(beadPose(3, 0).phi).toBe(72);
    expect(beadPose(3, 0).visible).toBe(false);
    expect(beadPose(2, 0).visible).toBe(true);
  });
});

describe("reelPosition / reelBlur", () => {
  it("真ん中の玉の気分とリールの位置が一致する", () => {
    for (let k = 0; k < SLOTS; k++) {
      const theta = -k * SLOT_DEG;
      expect(Math.round(reelPosition(theta)) % 5).toBe(moodOfSlot(centerIndex(theta)));
    }
  });
  it("ゆっくりならぼかさない・速いほど強く（上限 2.5px）", () => {
    expect(reelBlur(0.1)).toBe(0);
    expect(reelBlur(0.5)).toBe(1);
    expect(reelBlur(-5)).toBe(2.5);
  });
});

describe("tapAction / nearestBead", () => {
  it("真ん中の玉をタップすると決定", () => {
    expect(tapAction(0, 0)).toEqual({ kind: "commit", index: 0 });
    expect(tapAction(2, -2 * SLOT_DEG + 5)).toEqual({ kind: "commit", index: 2 });
  });
  it("横の玉をタップすると、その玉が真ん中に来る角度へ回す", () => {
    const r = tapAction(1, 0);
    expect(r).toEqual({ kind: "rotate", target: -SLOT_DEG });
    if (r.kind === "rotate") expect(centerIndex(r.target)).toBe(1);
  });
  it("左の玉なら逆向き", () => {
    const r = tapAction(SLOTS - 1, 0);
    expect(r).toEqual({ kind: "rotate", target: SLOT_DEG });
  });
  it("タップした点にいちばん近い玉", () => {
    const p = beadPose(1, 0);
    expect(nearestBead(p.x + 3, p.y - 2, 0)).toBe(1);
    expect(nearestBead(0, -RADIUS, 0)).toBe(0);
  });
});
