"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

export type AppUser = {
  uid: string;
  /** ゲスト（匿名認証）かどうか */
  isGuest: boolean;
  /** API Route に渡す ID トークン */
  getIdToken: () => Promise<string | null>;
};

/** ログイン中のユーザー（未ログインなら null） */
export function useUser(): { user: AppUser | null; loading: boolean } {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u: User | null) => {
        setUser(
          u ? { uid: u.uid, isGuest: u.isAnonymous, getIdToken: () => u.getIdToken() } : null
        );
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

/** JSON ボディ付きの認証リクエスト（POST/PUT の定型をまとめる） */
export function authedJson(
  user: AppUser,
  method: "POST" | "PUT",
  url: string,
  body: unknown
) {
  return authedFetch(user, url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
