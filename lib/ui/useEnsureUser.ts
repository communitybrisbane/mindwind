"use client";

import { useEffect, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/db/firebase";
import { useUser, type AppUser } from "@/lib/db/useUser";

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

/**
 * ログイン中のユーザー。未ログインなら裏で signInAnonymously してゲストで始める（PLAN 48・契約 §4）。
 * ログイン済み（Google・ゲスト）はそのまま。loading はユーザーが確定するまで true。
 */
export function useEnsureUser(): { user: AppUser | null; loading: boolean; error: string } {
  const { user, loading } = useUser();
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || user || error) return;
    let cancelled = false;
    ensureAnonymousSignIn().catch(() => {
      if (!cancelled) setError("はじめられませんでした。通信を確かめて、もう一度開いてください。");
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading, error]);

  return { user, loading: !error && (loading || !user), error };
}
