"use client";

// 設定の「くらし」（PLAN 49）：音・振動・動きをへらす（端末ごと。lib/ui/preferences）と、
// 今週◯日をかくす（profile.hideStreak。契約 §8）。見た目はプロトタイプ .trow / .sw。

import { Paper } from "@/components/ui/Paper";
import Icon, { type IconName } from "@/components/ui/Icon";
import { setPreference, usePreferences, type Preferences } from "@/lib/ui/preferences";
import { sound, vibrate } from "@/lib/ui/feedback";
import styles from "./settings.module.css";

function Row({
  icon,
  label,
  on,
  onToggle,
}: {
  icon: IconName;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.trow}>
      <Icon name={icon} />
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={styles.sw}
        onClick={() => {
          onToggle();
          vibrate(8);
          sound("tick");
        }}
      />
    </div>
  );
}

const PREF_ROWS: Array<{ key: keyof Preferences; icon: IconName; label: string }> = [
  { key: "sound", icon: "bookmark", label: "音" },
  { key: "vibrate", icon: "hanko", label: "振動" },
  { key: "reduceMotion", icon: "swirl", label: "動きをへらす" },
];

export default function ToggleRows({
  hideStreak,
  onHideStreak,
}: {
  /** 今週◯日をかくす（profile 未取得のあいだは undefined で行を出さない） */
  hideStreak?: boolean;
  onHideStreak?: (value: boolean) => void;
}) {
  const prefs = usePreferences();
  return (
    <Paper as="section" className={styles.card} aria-label="くらし">
      <h3>くらし</h3>
      {PREF_ROWS.map((r) => (
        <Row
          key={r.key}
          icon={r.icon}
          label={r.label}
          on={prefs[r.key]}
          onToggle={() => setPreference(r.key, !prefs[r.key])}
        />
      ))}
      {hideStreak !== undefined && onHideStreak && (
        <Row
          icon="stack"
          label="今週の日数をかくす"
          on={hideStreak}
          onToggle={() => onHideStreak(!hideStreak)}
        />
      )}
    </Paper>
  );
}

export { ToggleRows };
