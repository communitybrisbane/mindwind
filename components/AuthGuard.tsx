"use client";

import type { ReactNode } from "react";
import LoadingScreen from "./LoadingScreen";
import { useEnsureUser } from "@/lib/ui/useEnsureUser";

/**
 * 認証ガード（PLAN 48）：未ログインでもリダイレクトせず、裏で匿名ログインして続ける。
 * オンボーディングは必須にしない（profile が無くてもそのまま表示。呼び名は自動の呼び名を使う）。
 * `allowWithoutProfile` は旧オンボーディング画面の互換のため残す（今は意味を持たない）。
 */
export default function AuthGuard({
  children,
}: {
  children: ReactNode;
  allowWithoutProfile?: boolean;
}) {
  const { user, error } = useEnsureUser();

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-secondary">
        {error}
      </div>
    );
  }
  if (!user) return <LoadingScreen />;
  return <>{children}</>;
}
