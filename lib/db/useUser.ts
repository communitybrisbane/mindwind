"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import { appCheckHeaders } from "./appCheck";

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

// 未ログインなら匿名で始める useEnsureUser は lib/ui/useEnsureUser.ts（契約 §4）

/** Authorization ヘッダー（と App Check のトークン。鍵が無ければ付かない）付き fetch。401（認証切れ）はスタート画面へ戻す */
export async function authedFetch(user: AppUser, input: RequestInfo, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  for (const [k, v] of Object.entries(await appCheckHeaders())) headers.set(k, v);
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

/** 認証付き GET → JSON。!ok なら null（呼び出し側は null を「取得できなかった」として扱う） */
export async function authedJsonOrNull(user: AppUser, url: string) {
  const res = await authedFetch(user, url);
  return res.ok ? res.json() : null;
}
