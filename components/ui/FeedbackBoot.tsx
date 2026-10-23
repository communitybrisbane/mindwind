"use client";

// フィードバックの起動（契約 §7 タスク44）。app/layout.tsx に1つ置く。
// - 最初の pointerdown で unlockAudio（AudioContext を作り、振動の「触れた印」を立てる）
// - useReducedMotion が <html class="rm"> を付け外しする
// 画面には何も描かない。

import { useEffect } from "react";
import { unlockAudio } from "@/lib/ui/feedback";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";

export function FeedbackBoot() {
  useReducedMotion();
  useEffect(() => {
    const opts = { capture: true, once: true } as const;
    window.addEventListener("pointerdown", unlockAudio, opts);
    return () => window.removeEventListener("pointerdown", unlockAudio, { capture: true });
  }, []);
  return null;
}

export default FeedbackBoot;
