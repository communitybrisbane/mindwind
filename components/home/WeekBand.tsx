"use client";

// 今週の便箋：月〜日の玉。書かなかった日は点線の輪、今日は緑の輪（呼吸）。
// 帯をタップ → 風の記録（onOpen）。今日の輪（玉）をタップ → 回転盤で選び直し（onToday）。

import type { KeyboardEvent, Ref } from "react";
import Bead, { BeadSlot } from "@/components/ui/Bead";
import Icon from "@/components/ui/Icon";
import type { DayEntry } from "@/lib/db/types";
import { moodDef } from "@/lib/logic/moods";
import styles from "./home.module.css";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

type Props = {
  /** 月〜日の7日分の日付キー */
  dates: string[];
  todayKey: string;
  /** 範囲の取得結果（読み込み中は null。点線の輪だけ出す） */
  days: DayEntry[] | null;
  /** 記録（thoughts）があった日。玉が無くても「書いた日」の点を出す */
  wroteDays: Set<string>;
  /** 一言の玉が飛んでいる間は今日の玉を隠す */
  hideTodayBead: boolean;
  /** 今日の玉がいま置かれた（ぽんと出る） */
  popToday: boolean;
  /** 今日のマスの位置（玉を飛ばす先） */
  todayRef?: Ref<HTMLSpanElement>;
  onOpen(): void;
  onToday(): void;
};

export default function WeekBand({
  dates,
  todayKey,
  days,
  wroteDays,
  hideTodayBead,
  popToday,
  todayRef,
  onOpen,
  onToday,
}: Props) {
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      className={`sheet ${styles.week}`}
      role="button"
      tabIndex={0}
      aria-label="今週の便箋（風の記録を開く）"
      onClick={onOpen}
      onKeyDown={onKey}
    >
      {dates.map((date, i) => {
        const entry = byDate.get(date);
        const isToday = date === todayKey;
        const mood = entry?.mood ?? null;
        const wrote = (entry?.records ?? 0) > 0 || wroteDays.has(date);
        const showBead = mood !== null && !(isToday && hideTodayBead);

        const inner = showBead ? (
          <Bead mood={mood} size={38} className={isToday && popToday ? styles.pop : undefined} />
        ) : (
          <>
            <BeadSlot size={38} today={isToday} />
            {wrote && !isToday && <span className={styles.wrote} aria-hidden="true" />}
          </>
        );

        return (
          <div key={date} className={`${styles.d} ${isToday ? styles.dToday : ""}`}>
            <span aria-hidden="true">{WEEKDAYS[i]}</span>
            {isToday ? (
              <button
                type="button"
                className={styles.todayBtn}
                aria-label={mood !== null ? `今日の気分（${moodDef(mood).name}）を選び直す` : "今日の気分を選ぶ"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToday();
                }}
              >
                <span ref={todayRef} className={styles.cell}>
                  {inner}
                </span>
              </button>
            ) : (
              <span className={styles.cell}>{inner}</span>
            )}
          </div>
        );
      })}
      <span className={styles.more} aria-hidden="true">
        <Icon name="arrow" />
      </span>
    </div>
  );
}
