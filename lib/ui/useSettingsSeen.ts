"use client";

// 歯車の赤い点（PLAN 51）。文字のフッターは出さず、ゲストのときだけ歯車に小さな赤い点を付ける。
// - 設定を開いたら消える（markSettingsSeen。ホームの歯車を押したときと、設定画面を開いたときに呼ぶ）
// - Google 連携済み（isGuest=false）なら出ない
// - 消してから NUDGE_REPEAT_DAYS 日たつと、また出す（端末ごと・localStorage）

import { useCallback, useSyncExternalStore } from "react";
import { useUser } from "@/lib/db/useUser";
import { tokyoDateKey } from "@/lib/logic/date";
import { NUDGE_REPEAT_DAYS } from "@/lib/logic/limits";

/** 契約 §4 の useNudge と同じキー（どちらから消しても同じ点が消える） */
export const SETTINGS_SEEN_KEY = "mindwind:nudgeDismissedOn";

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 赤い点を出すか（純粋関数）。ゲストで、未確認か、確認から repeatDays 日以上たったとき */
export function shouldShowGearDot(
  isGuest: boolean,
  seenOn: string | null,
  todayKey: string,
  repeatDays: number = NUDGE_REPEAT_DAYS
): boolean {
  if (!isGuest) return false;
  if (!seenOn || !DATE_RE.test(seenOn) || !DATE_RE.test(todayKey)) return true;
  const days = Math.round((toMs(todayKey) - toMs(seenOn)) / DAY_MS);
  // 端末の時計が戻った（未来の日付が入っている）ときは出さない
  return days >= repeatDays;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_SEEN_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readSeenOn(): string | null {
  try {
    return localStorage.getItem(SETTINGS_SEEN_KEY);
  } catch {
    return null;
  }
}

/** 設定を開いた印を付ける（今日の日付）。設定画面（49）もこれを呼んでよい */
export function markSettingsSeen(): void {
  try {
    localStorage.setItem(SETTINGS_SEEN_KEY, tokyoDateKey(new Date()));
  } catch {
    // 保存できない環境（プライベートモードなど）では、点は消えないまま
  }
  for (const l of listeners) l();
}

/** 歯車の赤い点の状態。SSR とユーザー未確定のあいだは出さない */
export function useSettingsSeen(): { showDot: boolean; markSeen(): void } {
  const { user } = useUser();
  const seenOn = useSyncExternalStore(subscribe, readSeenOn, () => null);
  const today = useSyncExternalStore(
    subscribe,
    () => tokyoDateKey(new Date()),
    () => ""
  );
  const markSeen = useCallback(() => markSettingsSeen(), []);
  const showDot = !!user && !!today && shouldShowGearDot(user.isGuest, seenOn, today);
  return { showDot, markSeen };
}
