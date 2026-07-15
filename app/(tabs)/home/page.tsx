"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import Calendar from "@/components/Calendar";
import DayRecordsModal from "@/components/DayRecordsModal";
import Header from "@/components/Header";
import RecentThoughts from "@/components/RecentThoughts";
import Toast from "@/components/Toast";
import { FlameIcon, GearIcon, SpiralIcon } from "@/components/icons";
import { authedFetch, useUser } from "@/lib/db/useUser";
import type { Profile, ShapedRecord } from "@/lib/db/types";
import { formatDateHeading, greeting, tokyoDateKey, tokyoHour } from "@/lib/logic/date";
import { calcStreak } from "@/lib/logic/streak";

export type Thought = ShapedRecord & { id: string; date: string };

export default function HomePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [thoughts, setThoughts] = useState<Thought[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
        <section className="relative overflow-hidden rounded-xl bg-primary p-4 text-white shadow-card">
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
              <GearIcon className="h-[18px] w-[18px]" />
            </Link>
          </div>
          <p className="mt-1 text-sm text-white/85">{now ? formatDateHeading(new Date()) : " "}</p>
          <div className="mt-4 flex items-center gap-2">
            <FlameIcon className="h-5 w-5 flex-none" />
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
            <Calendar
              recordedDates={new Set(thoughts.map((t) => t.date))}
              todayKey={now}
              onSelectDate={setSelectedDate}
            />
            <RecentThoughts thoughts={thoughts} onDelete={(id) => void deleteThought(id)} />
          </div>
        )}

        {selectedDate && thoughts && (
          <DayRecordsModal
            dateKey={selectedDate}
            thoughts={thoughts.filter((t) => t.date === selectedDate)}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </main>
    </>
  );
}
