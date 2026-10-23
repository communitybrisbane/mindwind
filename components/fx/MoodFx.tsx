"use client";

// 風の強さの粒子（PLAN 84）。canvas に描くだけ。数と動きは lib/ui/fxParticles.ts（純粋関数）に任せる。
// 追い風＝花びらと光の筋／そよ風＝葉／向かい風＝風の筋と葉／嵐＝雨と風の筋。凪は描かない（無風）。
// 座標は幅 390 の論理座標。canvas の実寸（devicePixelRatio、上限 2）に合わせて拡大する。

import { useEffect, useRef } from "react";
import type { MoodId } from "@/lib/logic/moods";
import {
  LOGICAL_WIDTH,
  adaptQuality,
  beadOrigin,
  burstAmount,
  frameDt,
  initialQuality,
  makeParticles,
  scatterFromBead,
  stepLeaf,
  stepPetal,
  stepRain,
  stepStreak,
  stormSoftness,
  strengthOf,
  trimParticles,
  visibleCount,
  visibleLeaves,
  type Leaf,
  type Particle,
} from "@/lib/ui/fxParticles";
import styles from "./fx.module.css";

export type MoodFxRun = {
  mood: MoodId;
  /** true＝グワッ（決めた）、false＝うっすら（セット） */
  full: boolean;
  /** 同じ風でも出し直すための通し番号 */
  id: number;
};

/** 端末の目安（重い端末は最初から粒を減らす）。セッション中に下げた係数は持ち越す */
let sessionQuality: number | null = null;

function startQuality(): number {
  if (sessionQuality !== null) return sessionQuality;
  if (typeof navigator === "undefined") return 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  sessionQuality = initialQuality({ cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory });
  return sessionQuality;
}

const SAMPLE_FRAMES = 45;

export function MoodFx({ run }: { run: MoodFxRun | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs || !run || run.mood === 2) return; // 凪は無風
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    // 実寸と論理座標の対応
    let scale = 1;
    let H = 844;
    const fit = () => {
      const w = cvs.clientWidth || LOGICAL_WIDTH;
      const h = cvs.clientHeight || 844;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      scale = w / LOGICAL_WIDTH;
      H = h / scale;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(cvs);

    const { mood, full } = run;
    let quality = startQuality();
    const made = makeParticles(mood, H, Math.random, quality);
    let parts: Particle[] = made.parts;
    let leaves: Leaf[] = made.leaves;
    const k = strengthOf(full);
    if (full && (mood === 0 || mood === 1)) {
      const o = beadOrigin(H);
      scatterFromBead(parts, o.x, o.y);
    }

    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    let frames = 0;
    let costSum = 0;
    let intervalSum = 0;

    const frame = (t: number) => {
      const begin = performance.now();
      const dt = frameDt(t, last);
      last = t;
      const el = (t - t0) / 1000;
      const burst = burstAmount(full, el);
      const n = visibleCount(parts.length, k, burst);
      ctx.clearRect(0, 0, LOGICAL_WIDTH, H);

      if (mood === 0 || mood === 1) {
        if (mood === 0) {
          // 光の筋
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          for (let i = 0; i < 3; i++) {
            const a = (0.05 + 0.035 * Math.sin(el * 0.7 + i * 1.7) + burst * 0.09) * k;
            ctx.fillStyle = `rgba(255,226,150,${a})`;
            ctx.beginPath();
            const x0 = 60 + i * 120;
            ctx.moveTo(x0, 0);
            ctx.lineTo(x0 + 70, 0);
            ctx.lineTo(x0 + 260, H);
            ctx.lineTo(x0 + 150, H);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        const alpha = Math.min(1, 0.4 + k * 0.6);
        for (let i = 0; i < n; i++) {
          const p = parts[i];
          if (p.kind !== "petal") continue;
          stepPetal(p, dt, el, H);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.52, 0, 0, 6.283);
          ctx.fill();
          ctx.restore();
        }
        if (mood === 0 && k > 0.6) {
          // きらめき
          for (let i = 0; i < 10; i++) {
            const x = (i * 97 + 40) % 380;
            const y = ((i * 151 + 60) % 780) * (H / 844);
            const a = 0.5 + 0.5 * Math.sin(el * 2 + i * 2.3);
            if (a > 0.6) {
              ctx.fillStyle = `rgba(255,240,200,${(a - 0.5) * 0.9})`;
              ctx.beginPath();
              ctx.arc(x, y, 1.8, 0, 6.28);
              ctx.fill();
            }
          }
        }
      }

      if (mood === 3) {
        const gust = 1 + 1.6 * burst;
        const sa = Math.min(1, 0.5 + k * 0.5);
        ctx.lineWidth = 1.3;
        for (let i = 0; i < n; i++) {
          const p = parts[i];
          if (p.kind !== "streak") continue;
          stepStreak(p, dt, H, gust, 120);
          ctx.strokeStyle = `rgba(255,240,215,${p.a * sa})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.l * gust * 0.8, p.y + p.l * 0.05);
          ctx.stroke();
        }
        const nl = visibleLeaves(leaves.length, k, burst);
        ctx.fillStyle = "rgba(230,200,150,.6)";
        for (let i = 0; i < nl; i++) {
          const p = leaves[i];
          stepLeaf(p, dt, el, H, gust);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, 6.28);
          ctx.fill();
          ctx.restore();
        }
      }

      if (mood === 4) {
        const soft = stormSoftness(full, el); // 嵐は約3秒で弱まる
        const nn = Math.floor(n * soft);
        const fade = soft * (0.5 + k * 0.5);
        for (let i = 0; i < nn; i++) {
          const p = parts[i];
          if (p.kind === "rain") {
            stepRain(p, dt, H);
            ctx.strokeStyle = `rgba(205,220,240,${p.a * fade})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 0.018, p.y + p.vy * 0.018);
            ctx.stroke();
          } else if (p.kind === "streak") {
            stepStreak(p, dt, H, 1, 160);
            ctx.strokeStyle = `rgba(225,235,250,${p.a * fade})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.l, p.y + p.l * 0.06);
            ctx.stroke();
          }
        }
      }

      // 重い端末：フレーム間隔（と描画にかかった時間）の平均が長ければ粒を減らす（増やしはしない）
      if (frames > 0) intervalSum += dt * 1000; // 最初のフレームは起動の待ちを含むので数えない
      costSum += performance.now() - begin;
      frames++;
      if (frames > SAMPLE_FRAMES) {
        const avg = Math.max(intervalSum / (frames - 1), costSum / frames);
        const next = adaptQuality(quality, avg);
        if (next < quality) {
          const ratio = next / quality;
          parts = trimParticles(parts, ratio);
          leaves = trimParticles(leaves, ratio);
          quality = next;
          sessionQuality = next;
        }
        frames = 0;
        costSum = 0;
        intervalSum = 0;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    };
  }, [run]);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}

export default MoodFx;
