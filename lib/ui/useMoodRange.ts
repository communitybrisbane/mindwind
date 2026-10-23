"use client";

// 風の記録（月／年）のための GET /api/moods のキャッシュつき取得（PLAN 73・74）。
// - 同じユーザー・同じ範囲は使い回す（モジュール内のキャッシュ。同時の取得は1本にまとめる）
// - 古くなった値（STALE_MS）はすぐ返しつつ裏で取り直す（SWR 風）
// - 今日の気分は useTodayMood の値を重ねる（選び直しがすぐ玉に出る）

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { MoodRangeResponse } from "@/lib/api/contracts";
import type { DayEntry } from "@/lib/db/types";
import { useTodayMood } from "./useTodayMood";
import { authedFetch, useUser, type AppUser } from "@/lib/db/useUser";

const STALE_MS = 60_000;

type Entry = { days: DayEntry[] | null; fetchedAt: number; inflight: Promise<void> | null };

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
/** 変化のたびに増やす（useSyncExternalStore のスナップショット） */
let tick = 0;

function emit() {
  tick++;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const keyOf = (uid: string, from: string, to: string) => `${uid}:${from}:${to}`;

function fetchRange(user: AppUser, from: string, to: string, force: boolean): Promise<void> {
  const key = keyOf(user.uid, from, to);
  const entry = cache.get(key);
  if (entry?.inflight) return entry.inflight;
  if (!force && entry?.days && Date.now() - entry.fetchedAt < STALE_MS) return Promise.resolve();

  const p = (async () => {
    try {
      const q = new URLSearchParams({ from, to });
      const res = await authedFetch(user, `/api/moods?${q}`);
      if (!res.ok) throw new Error(`GET /api/moods ${res.status}`);
      const data = (await res.json()) as MoodRangeResponse;
      cache.set(key, { days: data.days, fetchedAt: Date.now(), inflight: null });
    } catch (e) {
      console.error("mood range fetch failed:", e);
      const cur = cache.get(key);
      cache.set(key, { days: cur?.days ?? null, fetchedAt: cur?.fetchedAt ?? 0, inflight: null });
    } finally {
      emit();
    }
  })();
  cache.set(key, { days: entry?.days ?? null, fetchedAt: entry?.fetchedAt ?? 0, inflight: p });
  return p;
}

/** すべての範囲のキャッシュを古い扱いにする（記録の保存・削除のあとに呼ぶと次の表示で取り直す） */
export function invalidateMoodRanges(): void {
  for (const [k, e] of cache) cache.set(k, { ...e, fetchedAt: 0 });
  emit();
}

export function useMoodRange(from: string, to: string): { days: DayEntry[] | null; reload(): void } {
  const { user } = useUser();
  const today = useTodayMood();
  useSyncExternalStore(
    subscribe,
    () => tick,
    () => 0
  );

  useEffect(() => {
    if (user && from && to) void fetchRange(user, from, to, false);
  }, [user, from, to]);

  const reload = useCallback(() => {
    if (user && from && to) void fetchRange(user, from, to, true);
  }, [user, from, to]);

  const cached = user ? (cache.get(keyOf(user.uid, from, to))?.days ?? null) : null;

  // 今日の気分（選び直し直後の楽観値を含む）を重ねる
  const days = useMemo(() => {
    if (!cached || today.loading) return cached;
    return cached.map((d) => (d.date === today.date && d.mood !== today.mood ? { ...d, mood: today.mood } : d));
  }, [cached, today.loading, today.date, today.mood]);

  return { days, reload };
}
