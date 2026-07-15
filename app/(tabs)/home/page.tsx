"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import Calendar from "@/components/Calendar";
import Header from "@/components/Header";
import RecentThoughts from "@/components/RecentThoughts";
import Toast from "@/components/Toast";
import { SpiralIcon } from "@/components/icons";
import { authedFetch, useUser } from "@/lib/db/useUser";
import type { Profile, ShapedRecord } from "@/lib/db/types";
import { formatDateHeading, greeting, tokyoDateKey, tokyoHour } from "@/lib/logic/date";
import { calcStreak } from "@/lib/logic/streak";

export type Thought = ShapedRecord & { id: string; date: string };

export default function HomePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [thoughts, setThoughts] = useState<Thought[] | null>(null);

  // 日付・挨拶はクライアントで確定（ハイドレーション差異を避ける）
  const now = useSyncExternalStore(
    () => () => {},
    () => tokyoDateKey(new Date()),
    () => ""
  );

  useEffect(() => {
    if (!user) return;
    authedFetch(user, "/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data?.profile ?? null))
      .catch(() => {});
    authedFetch(user, "/api/thoughts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setThoughts(data?.thoughts ?? []))
      .catch(() => setThoughts([]));
  }, [user]);

  const streak = thoughts ? calcStreak(thoughts.map((t) => t.date), now) : 0;
  const hasRecords = (thoughts?.length ?? 0) > 0;

  // 削除するとカレンダーの点灯・ストリークも state 経由で自動再計算される
  async function deleteThought(id: string) {
    if (!user) return;
    if (!window.confirm("この記録を削除しますか？ 削除すると元に戻せません。")) return;
    try {
      const res = await authedFetch(user, `/api/thoughts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      setThoughts((t) => t?.filter((thought) => thought.id !== id) ?? t);
    } catch {
      window.alert("削除できませんでした。少し待ってからもう一度試してください。");
    }
  }

  return (
    <>
      <Header />
      <Toast />
      <main className="flex-1 overflow-y-auto p-4">
        {/* Hero カード */}
        <section className="relative overflow-hidden rounded-xl bg-primary p-4 text-white shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
          <SpiralIcon
            aria-hidden
            className="pointer-events-none absolute -right-6 top-6 h-24 w-44 text-white/10"
          />
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-semibold">
              {now ? greeting(tokyoHour(new Date())) : ""}
              {profile?.nickname ? `、${profile.nickname}さん` : ""}
            </h1>
            <Link
              href="/onboarding?edit=1"
              aria-label="プロフィールを編集"
              className="relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
              </svg>
            </Link>
          </div>
          <p className="mt-1 text-sm text-white/85">{now ? formatDateHeading(new Date()) : " "}</p>
          <div className="mt-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none" fill="currentColor" aria-hidden>
              <path d="M12 2c.7 3 .3 5-1.4 6.9C9.3 10.3 8 11.9 8 14a4 4 0 0 0 8 0c0-.8-.2-1.6-.6-2.3-.6 1-1.6 1.5-1.6 1.5.5-2.4-.2-5-1.8-7.1C11.5 5 11.7 3.4 12 2Zm-4.6 6C6 9.7 5 11.7 5 14a7 7 0 1 0 14 0c0-2-.8-3.9-2-5.3.1.9 0 1.8-.4 2.6C15.7 9 14 6.5 14.4 3.2 13 4.6 12.6 6.6 13 8.5c-1-1.2-1.6-2.7-1.6-4.3-2.5 1.4-4 3.4-4 3.8Z" />
            </svg>
            {hasRecords ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold leading-none">{streak}</span>
                <span className="text-base">日連続で記録中</span>
              </p>
            ) : (
              <p className="text-base">今日から記録を始めよう</p>
            )}
          </div>
        </section>

        {/* ゲスト利用中の注意バナー（タップで連携画面へ） */}
        {user?.isGuest && (
          <Link
            href="/onboarding?edit=1"
            className="mt-3 block rounded-lg bg-leaf px-3 py-2.5 text-[13px] leading-relaxed text-primary"
          >
            ゲスト利用中。データはこの端末だけに保存されます。
            <span className="font-semibold underline">Google アカウントと連携して残す</span>
          </Link>
        )}

        {thoughts && now && (
          <div className="mt-4 flex flex-col gap-4 pb-4">
            <Calendar recordedDates={new Set(thoughts.map((t) => t.date))} todayKey={now} />
            <RecentThoughts thoughts={thoughts} onDelete={(id) => void deleteThought(id)} />
          </div>
        )}
      </main>
    </>
  );
}
