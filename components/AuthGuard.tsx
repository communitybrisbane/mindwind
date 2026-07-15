"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SpiralIcon } from "./icons";
import { authedFetch, useUser } from "@/lib/db/useUser";
import type { Profile } from "@/lib/db/types";

// profile フィールドが「存在しない」＝初回ログインとみなす。
// スキップ時は空のプロフィールを保存するので、空値でも2回目以降は素通りする
function isFirstLogin(profile: Profile | null | undefined): boolean {
  return profile == null;
}

/**
 * 認証ガード：未ログイン→`/`、初回ログイン（profile 未設定）→`/onboarding`。
 * `allowWithoutProfile` はオンボーディング画面自身に付ける（リダイレクトループ防止）。
 */
export default function AuthGuard({
  children,
  allowWithoutProfile = false,
}: {
  children: ReactNode;
  allowWithoutProfile?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    if (allowWithoutProfile) {
      // setState は effect 内で同期的に呼ばない（lint ルール準拠）
      const t = setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    authedFetch(user, "/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (isFirstLogin(data?.profile)) router.replace("/onboarding");
        else setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, allowWithoutProfile, pathname, router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <SpiralIcon className="h-8 w-16 animate-pulse text-accent" />
      </div>
    );
  }
  return <>{children}</>;
}
