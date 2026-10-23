"use client";

// ホーム右上の歯車（設定へ）。ゲストのときだけ小さな赤い点（PLAN 51・useSettingsSeen）。

import { useRouter } from "next/navigation";
import { RoundButton } from "@/components/ui/RoundButton";
import { sound } from "@/lib/ui/feedback";
import { useSettingsSeen } from "@/lib/ui/useSettingsSeen";
import styles from "./home.module.css";

export default function GearButton() {
  const router = useRouter();
  const { showDot, markSeen } = useSettingsSeen();

  return (
    <span className={styles.gear}>
      <RoundButton
        variant="chalk"
        icon="gear"
        aria-label={showDot ? "設定（アカウントを守る）" : "設定"}
        onClick={() => {
          sound("rub");
          markSeen();
          router.push("/settings");
        }}
      />
      {showDot && <span className={styles.gdot} aria-hidden="true" />}
    </span>
  );
}
