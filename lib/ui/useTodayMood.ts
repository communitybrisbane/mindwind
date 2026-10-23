"use client";

// 今日の気分を全画面に配る1か所の仕組み（PLAN 62）。
// GET /api/mood をモジュール内で1回だけ取り（同じユーザー・同じ日なら使い回す）、PUT で更新する。
// - SWR 風：キャッシュをすぐ返し、画面に戻ったとき日付が変わっていれば取り直す
// - 楽観更新：setMood はすぐ画面に反映し、失敗したら元に戻して例外を投げる
// 背景の風（84）・封蝋（64・66）・今週の便箋（72）・風の記録（74）が同じ値を見る。

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { PutMoodResponse, TodayMoodResponse } from "@/lib/api/contracts";
import { todayKeyOf } from "@/lib/logic/moodDay";
import { isMoodId, type MoodId } from "@/lib/logic/moods";
import { authedFetch, authedJson, useUser, type AppUser } from "@/lib/db/useUser";

type State = {
  /** 値の持ち主。null＝起動画面が primeTodayMood で入れた値（最初に使ったユーザーのものとみなす） */
  uid: string | null;
  date: string;
  mood: MoodId | null;
  status: "idle" | "loading" | "ready" | "error";
};

const INITIAL: State = { uid: null, date: "", mood: null, status: "idle" };

let state: State = INITIAL;
let inflight: Promise<void> | null = null;
/** 書き込みのたびに増やす。取得中に選び直されたら、古い GET の結果で上書きしない */
let version = 0;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

/** 今日の気分を外から購読する（React の外：背景の演出など） */
export function subscribeTodayMood(listener: () => void): () => void {
  return subscribe(listener);
}

/** いまの今日の気分（今日の値として確定していなければ null） */
export function getTodayMoodSnapshot(): { date: string; mood: MoodId | null } {
  return { date: state.date, mood: state.date === todayKeyOf() ? state.mood : null };
}

/** 起動画面が取った GET /api/mood の結果を渡して二重取得を避ける */
export function primeTodayMood(res: TodayMoodResponse, uid?: string): void {
  if (!isMoodId(res.mood) && res.mood !== null) return;
  version++;
  setState({ uid: uid ?? null, date: res.date, mood: res.mood, status: "ready" });
}

function isFresh(uid: string): boolean {
  return (
    (state.uid === uid || state.uid === null) &&
    state.date === todayKeyOf() &&
    (state.status === "ready" || state.status === "loading")
  );
}

function load(user: AppUser, force = false): Promise<void> {
  if (!force && isFresh(user.uid)) {
    if (state.uid === null) setState({ ...state, uid: user.uid });
    return inflight ?? Promise.resolve();
  }
  if (inflight && state.uid === user.uid && !force) return inflight;

  const startedAt = ++version;
  const sameOwner = state.uid === user.uid && state.date === todayKeyOf();
  setState({
    uid: user.uid,
    date: sameOwner ? state.date : todayKeyOf(),
    mood: sameOwner ? state.mood : null,
    status: "loading",
  });

  const p: Promise<void> = (async () => {
    try {
      const res = await authedFetch(user, "/api/mood");
      if (!res.ok) throw new Error(`GET /api/mood ${res.status}`);
      const data = (await res.json()) as TodayMoodResponse;
      if (version !== startedAt || state.uid !== user.uid) return;
      setState({
        uid: user.uid,
        date: data.date,
        mood: isMoodId(data.mood) ? data.mood : null,
        status: "ready",
      });
    } catch (e) {
      console.error("today mood fetch failed:", e);
      if (version === startedAt && state.uid === user.uid) setState({ ...state, status: "error" });
    }
  })().finally(() => {
    if (inflight === p) inflight = null;
  });
  inflight = p;
  return p;
}

async function save(user: AppUser, mood: MoodId): Promise<void> {
  const prev = state;
  const startedAt = ++version;
  setState({ uid: user.uid, date: todayKeyOf(), mood, status: "ready" });

  try {
    const res = await authedJson(user, "PUT", "/api/mood", { mood });
    if (!res.ok) throw new Error(`PUT /api/mood ${res.status}`);
    const data = (await res.json()) as PutMoodResponse;
    if (version === startedAt) {
      setState({ uid: user.uid, date: data.date, mood: data.mood, status: "ready" });
    }
  } catch (e) {
    // 楽観更新を元に戻す（後から別の選び直しがあれば、そちらを優先して戻さない）
    if (version === startedAt) setState(prev.uid === user.uid ? prev : { ...INITIAL });
    throw e;
  }
}

export function useTodayMood(): {
  mood: MoodId | null;
  date: string;
  loading: boolean;
  setMood(m: MoodId): Promise<void>;
} {
  const { user } = useUser();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!user) return;
    void load(user);
    // 画面に戻ったとき、日付が変わっていれば取り直す（深夜0時をまたいだとき）
    const onVisible = () => {
      if (document.visibilityState === "visible" && !isFresh(user.uid)) void load(user);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  const setMood = useCallback(
    async (m: MoodId) => {
      if (!user) throw new Error("not signed in");
      await save(user, m);
    },
    [user]
  );

  const mine = user !== null && (snap.uid === user.uid || snap.uid === null);
  const today = todayKeyOf();
  const current = mine && snap.date === today;
  return {
    mood: current ? snap.mood : null,
    date: current ? snap.date : today,
    loading: !current || snap.status === "idle" || (snap.status === "loading" && snap.mood === null),
    setMood,
  };
}
