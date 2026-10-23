"use client";

// 風の記録（月・年）のモーダル（PLAN 74・プロトタイプ ui-v5 の #hist / #hSheet / #hNav）。
// ホームの今週の便箋の帯をタップで開く。別ルートにしない。暗い幕の上に大きな紙がすべり上がり、タブバーの上に重なる。
// - 紙の中：見出し（「2026年10月」／「2026年」）＋「タップで月と年を行き来できます」＋月／年のグリッド
// - 下（親指の弧）：とじる（チェック）・前へ／次へ（chalk）・真ん中に「月／年」の切り替え。幕のタップ・Esc でも閉じる
// - 月の日付をタップ → DayModal（その日の記録・編集・削除・過去日なら「この日の日記を書く」）
// データは useMoodRange（GET /api/moods のキャッシュつき取得）。

import { useCallback, useEffect, useMemo, useState } from "react";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import type { DayEntry } from "@/lib/db/types";
import { todayKeyOf } from "@/lib/logic/moodDay";
import { sound, vibrate } from "@/lib/ui/feedback";
import { invalidateMoodRanges, useMoodRange } from "@/lib/ui/useMoodRange";
import DayModal from "./DayModal";
import MonthGrid, { canGoNext, initialView, shiftView, viewRange, viewTitle, type HistView } from "./MonthGrid";
import YearGrid from "./YearGrid";
import styles from "./hist.module.css";

export type HistorySheetProps = { open: boolean; onClose: () => void };

export default function HistorySheet({ open, onClose }: HistorySheetProps) {
  const [today, setToday] = useState(() => todayKeyOf());
  const [view, setView] = useState<HistView>(() => initialView(todayKeyOf()));
  const [selected, setSelected] = useState<string | null>(null);

  // 開くたびに今日の月から（プロトタイプ open()）。深夜をまたいでも今日を取り直す
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const t = todayKeyOf();
      setToday(t);
      setView(initialView(t));
      setSelected(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    vibrate(10);
    sound("rub");
  }, [open]);

  const range = viewRange(view, today);
  const { days, reload } = useMoodRange(open && range ? range.from : "", open && range ? range.to : "");
  const dayMap = useMemo(() => {
    if (!range) return new Map<string, DayEntry>(); // 全部が未来：空のまま描く
    if (!days) return null;
    return new Map(days.map((d) => [d.date, d] as const));
  }, [days, range]);

  // Esc で閉じる（日のモーダルが開いているときはそちらが先）
  useEffect(() => {
    if (!open || selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selected, onClose]);

  const close = () => {
    vibrate(8);
    sound("tick");
    onClose();
  };

  const go = (dir: -1 | 1) => {
    vibrate(6);
    sound("tick");
    setView((v) => shiftView(v, dir));
  };

  const setMode = (mode: HistView["mode"]) => {
    if (mode === view.mode) return;
    vibrate(8);
    sound("rub");
    setView((v) => ({ ...v, mode }));
  };

  const pickMonth = (month: number) => {
    vibrate(10);
    sound("pop");
    setView((v) => ({ ...v, mode: "month", month }));
  };

  const selectDay = (date: string) => {
    vibrate(8);
    sound("pop");
    setSelected(date);
  };

  // 記録を直した・消したあと：全範囲のキャッシュを古くして、いまの範囲を取り直す
  const onChanged = useCallback(() => {
    invalidateMoodRanges();
    reload();
  }, [reload]);

  const selectedEntry = selected ? dayMap?.get(selected) : undefined;

  return (
    <div
      className={[styles.hist, open ? styles.show : ""].filter(Boolean).join(" ")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="風の記録"
      aria-hidden={!open}
      inert={!open}
    >
      <Paper className={styles.hSheet}>
        <div className={styles.hTitle} aria-live="polite">
          {viewTitle(view)}
        </div>
        <div className={styles.hSub}>タップで月と年を行き来できます</div>
        <div className={styles.hBody}>
          {view.mode === "month" ? (
            <MonthGrid year={view.year} month={view.month} days={dayMap} today={today} onSelect={selectDay} />
          ) : (
            <YearGrid year={view.year} days={dayMap} today={today} onPickMonth={pickMonth} />
          )}
        </div>
      </Paper>

      <div className={styles.hNav}>
        <RoundButton icon="check" aria-label="とじる" size={64} onClick={close} />
        <RoundButton variant="chalk" icon="arrowL" aria-label="前へ" onClick={() => go(-1)} />
        <div className={styles.hMode} role="group" aria-label="表示の切り替え">
          <button
            type="button"
            className={view.mode === "month" ? styles.on : undefined}
            aria-pressed={view.mode === "month"}
            onClick={() => setMode("month")}
          >
            月
          </button>
          <button
            type="button"
            className={view.mode === "year" ? styles.on : undefined}
            aria-pressed={view.mode === "year"}
            onClick={() => setMode("year")}
          >
            年
          </button>
        </div>
        <RoundButton
          variant="chalk"
          icon="arrow"
          aria-label="次へ"
          onClick={() => go(1)}
          disabled={!canGoNext(view, today)}
        />
      </div>

      <DayModal
        date={selected}
        today={today}
        mood={selectedEntry?.mood ?? null}
        records={selectedEntry?.records ?? 0}
        onClose={() => setSelected(null)}
        onChanged={onChanged}
      />
    </div>
  );
}
