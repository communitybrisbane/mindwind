"use client";

import { RoundButton } from "@/components/ui/RoundButton";
import { WaxSeal } from "@/components/mood/Postmark";
import type { MoodId } from "@/lib/logic/moods";
import styles from "./record.module.css";

/** 長押しで封をする判子ボタン（98px・緑・金色の輪）。プロトタイプ #recHold */
export function SealHoldButton({
  onSeal,
  disabled,
}: {
  onSeal: () => void;
  disabled?: boolean;
}) {
  return (
    <RoundButton
      variant="green"
      icon="hanko"
      size={98}
      aria-label="長押しで保存"
      holdMs={700}
      onHold={onSeal}
      disabled={disabled}
    />
  );
}

/** 紙の上に押される封蝋（今日の玉の風）。プロトタイプ #recSeal */
export function SealStamp({ mood, playing }: { mood: MoodId | null; playing: boolean }) {
  return (
    <div className={styles.seal} aria-hidden="true">
      <WaxSeal mood={mood} playing={playing} />
    </div>
  );
}

const SealHold = { Button: SealHoldButton, Stamp: SealStamp };
export default SealHold;
