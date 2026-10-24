"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/db/firebase";
import { useUser, type AppUser } from "@/lib/db/useUser";

/** 匿名ログインに失敗したとき、自動で再試行するまでの待ち時間（ミリ秒）。使い切ったら人の操作を待つ */
export const ANON_RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 7000];

/**
 * 失敗が failedCount 回目（1 始まり）のあと、何ミリ秒待って再試行するか（純粋関数）。
 * 自動の再試行を使い切ったら null（エラー表示に切り替える）。
 */
export function nextRetryDelay(
  failedCount: number,
  delays: readonly number[] = ANON_RETRY_DELAYS_MS
): number | null {
  if (!Number.isInteger(failedCount) || failedCount < 1) return delays.length > 0 ? delays[0] : null;
  return failedCount <= delays.length ? delays[failedCount - 1] : null;
}

// 同時に何か所から呼ばれても匿名ログインは1回だけ（AuthGuard と起動画面が同時に使う）
let anonSignIn: Promise<unknown> | null = null;
function ensureAnonymousSignIn(): Promise<unknown> {
  if (!anonSignIn) {
    anonSignIn = signInAnonymously(auth).finally(() => {
      anonSignIn = null;
    });
  }
  return anonSignIn;
}

const ERROR_MESSAGE = "はじめられませんでした。通信を確かめて、もう一度ためしてください。";

/**
 * ログイン中のユーザー。未ログインなら裏で signInAnonymously してゲストで始める（PLAN 48・契約 §4）。
 * 失敗したら間隔をあけて数回自動で再試行し、それでもだめなら error を返す。retry() で最初からやり直せる。
 * ログイン済み（Google・ゲスト）はそのまま。loading はユーザーが確定するまで true。
 */
export function useEnsureUser(): {
  user: AppUser | null;
  loading: boolean;
  error: string;
  retry: () => void;
} {
  const { user, loading } = useUser();
  const [error, setError] = useState("");
  // 再試行のたびに増やして、下の effect を回し直す
  const [round, setRound] = useState(0);
  const failedRef = useRef(0);

  useEffect(() => {
    if (loading || user || error) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    ensureAnonymousSignIn().catch(() => {
      if (cancelled) return;
      failedRef.current += 1;
      const wait = nextRetryDelay(failedRef.current);
      if (wait === null) {
        setError(ERROR_MESSAGE);
        return;
      }
      timer = setTimeout(() => {
        if (!cancelled) setRound((n) => n + 1);
      }, wait);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user, loading, error, round]);

  const retry = useCallback(() => {
    failedRef.current = 0;
    setError("");
    setRound((n) => n + 1);
  }, []);

  return { user, loading: !error && (loading || !user), error, retry };
}
