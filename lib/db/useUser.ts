"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

export type AppUser = {
  uid: string;
  /** API Route に渡す ID トークン。開発用スタブでは null（サーバー側が dev uid に解決する） */
  getIdToken: () => Promise<string | null>;
};

// 認証実装まで（Phase 6）の開発用固定ユーザー。本番ビルドでは必ず null
const devUser: AppUser | null =
  process.env.NODE_ENV === "development"
    ? { uid: "dev-user", getIdToken: async () => null }
    : null;

/** ログイン中のユーザー（未ログイン時は dev のみスタブを返す） */
export function useUser(): { user: AppUser | null; loading: boolean } {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u: User | null) => {
        setUser(u ? { uid: u.uid, getIdToken: () => u.getIdToken() } : devUser);
        setLoading(false);
      }),
    []
  );

  return { user, loading };
}

/** Authorization ヘッダー付き fetch（トークンがない dev スタブ時はヘッダーなし） */
export async function authedFetch(user: AppUser, input: RequestInfo, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
