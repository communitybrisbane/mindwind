"use client";

import { useCallback, useEffect, useState } from "react";
import { authedJsonOrNull, useUser } from "@/lib/db/useUser";
import type { Profile } from "@/lib/db/types";
import { displayNameFor } from "@/lib/logic/autoName";

/**
 * 表示用のプロフィール（PLAN 48）。
 * name は「呼び名があればそれ、なければ自動の呼び名」＋「さん」。
 * 自動の呼び名は表示専用。保存しない・AI の {{profile}} に入れない（nickname が空なら未入力扱い）。
 */
export function useProfile(): {
  /** DB の profile（未設定なら null。取得中も null） */
  profile: Profile | null;
  /** 表示用の呼び名（例「風見さん」）。ユーザー未確定のときは "" */
  name: string;
  /** 自動の呼び名を使っているか */
  isAuto: boolean;
  loading: boolean;
  reload(): void;
} {
  const { user, loading: userLoading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authedJsonOrNull(user, "/api/profile")
      .then((data: { profile?: Profile | null } | null) => {
        if (cancelled) return;
        setProfile(data?.profile ?? null);
        setLoadedFor(user.uid);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedFor(user.uid);
      });
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const current = user && loadedFor === user.uid ? profile : null;
  const nickname = current?.nickname?.trim() ?? "";
  return {
    profile: current,
    name: user ? displayNameFor(nickname, user.uid) : "",
    isAuto: nickname === "",
    loading: userLoading || (!!user && loadedFor !== user.uid),
    reload,
  };
}

/** 表示用の呼び名だけ欲しいとき（契約の useDisplayName と同じ形） */
export function useDisplayName(): { name: string; isAuto: boolean; reload(): void } {
  const { name, isAuto, reload } = useProfile();
  return { name, isAuto, reload };
}
