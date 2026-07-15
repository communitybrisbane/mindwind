"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

export type AppUser = {
  uid: string;
  /** API Route に渡す ID トークン。開発用スタブでは null（サーバー側が dev uid に解決する） */
  getIdToken: () => Promise<string | null>;
};

/** ログイン中のユーザー（未ログインなら null） */
export function useUser(): { user: AppUser | null; loading: boolean } {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u: User | null) => {
        setUser(u ? { uid: u.uid, getIdToken: () => u.getIdToken() } : null);
        setLoading(false);
      }),
    []
  );

  return { user, loading };
}

/** Authorization ヘッダー付き fetch。401（認証切れ）はスタート画面へ戻す */
export async function authedFetch(user: AppUser, input: RequestInfo, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    window.location.href = "/";
  }
  return res;
}
