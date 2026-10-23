"use client";

// 真ん中の文字のリール（玉の名前と説明）。位置は MoodWheel が ref 経由で直接動かす（毎フレーム再描画しない）。
// 15 段（5つの気分 × 3）を縦に並べ、translateY(-(p+5)*176) で真ん中の5段を見せる（プロトタイプどおり）。

import type { Ref } from "react";
import { MOODS } from "@/lib/logic/moods";
import { SLOTS } from "@/lib/ui/wheelPhysics";
import styles from "./mood.module.css";

/** 1段の高さ（px） */
export const REEL_ITEM_HEIGHT = 176;

type Props = {
  reelRef: Ref<HTMLDivElement>;
  hidden?: boolean;
};

export default function MoodReel({ reelRef, hidden = false }: Props) {
  return (
    <div className={styles.reelwin} style={{ opacity: hidden ? 0 : 1 }} aria-hidden="true">
      <div ref={reelRef} className={styles.reel}>
        {Array.from({ length: SLOTS }, (_, k) => {
          const m = MOODS[k % 5];
          return (
            <div key={k} className={styles.reelItem}>
              <div className={styles.reelName}>{m.name}</div>
              <div className={styles.reelDesc}>
                {m.stage}
                <br />
                {m.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
