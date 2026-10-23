"use client";

// ホーム（PLAN 72・51）。見た目と動きの正は docs/prototype/ui-v5.html の「③ ホーム」。
// 挨拶・今週◯日・今週の便箋・今日の1枚・手紙のカード・歯車。従来のカレンダーと最近の記録の一覧は置かない。

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import GearButton from "@/components/home/GearButton";
import Greeting from "@/components/home/Greeting";
import LetterCard from "@/components/home/LetterCard";
import ReunionNote, { shortDate, type ReunionPick } from "@/components/home/ReunionNote";
import WeekBand from "@/components/home/WeekBand";
import styles from "@/components/home/home.module.css";
import HistorySheet from "@/components/hist/HistorySheet";
import Bead from "@/components/ui/Bead";
import { showToast } from "@/components/ui/Toast";
import type { ThoughtsListResponse } from "@/lib/api/contracts";
import type { ShapedRecord, ThoughtSummary } from "@/lib/db/types";
import { authedJsonOrNull, useUser } from "@/lib/db/useUser";
import { splitDateHeading, tokyoDateKey, tokyoHour } from "@/lib/logic/date";
import { isMoodId, type MoodId } from "@/lib/logic/moods";
import { pickReunion, type ReunionLabel } from "@/lib/logic/reunion";
import { isWelcomeBack, weekRecordDays } from "@/lib/logic/streak";
import { addDays, weekDates, weekKeyFor } from "@/lib/logic/week";
import { useProfile } from "@/lib/ui/useDisplayName";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useMoodRange } from "@/lib/ui/useMoodRange";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";

/** 旧 UI の型（app/(tabs)/home/useThoughtEditing.ts が import している。80 がそのファイルを消すときに一緒に消す） */
export type Thought = ShapedRecord & { id: string; date: string };

const FLY_KEY ="mindwind:flyMood";
const COUNT_KEY = "mindwind:home:weekCount";
const REUNION_PREFIX = "mindwind:reunion:";
const REUNION_FLIPPED_PREFIX = "mindwind:reunionFlipped:";
/** 休み明けの判定に見る日数（この範囲の気分と、全記録の日付を合わせる） */
const LOOKBACK_DAYS = 28;

const noopSubscribe = () => () => {};

function hello(hour: number, welcomeBack: boolean): string {
  if (welcomeBack) return "おかえり";
  if (hour >= 5 && hour < 11) return "おはよう";
  if (hour >= 11 && hour < 18) return "こんにちは";
  return "こんばんは";
}

function storageGet(store: "local" | "session", key: string): string | null {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function storageSet(store: "local" | "session", key: string, value: string | null): void {
  try {
    const s = store === "local" ? localStorage : sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // 保存できない環境では、その場かぎりで動く
  }
}

/** 日付の差から再会のラベルを決め直す（保存してあるのは id だけなので） */
function labelFor(thought: ThoughtSummary, todayKey: string): ReunionLabel {
  const diff = Math.round((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${thought.date}T00:00:00Z`)) / 86_400_000);
  if (diff >= 6 && diff <= 8) return "1週間前のあなた";
  if (diff >= 29 && diff <= 31) return "1か月前のあなた";
  return "最初に書いた日のあなた";
}

/**
 * 今日の1枚を決める（1日1回・端末ごと）。今日の分が保存済みならそれを使い、
 * 無ければ前回の記録を避けて pickReunion で選び、localStorage["mindwind:reunion:<today>"] に id を残す。
 */
function resolveReunion(thoughts: ThoughtSummary[], todayKey: string): ReunionPick | null {
  const savedId = storageGet("local", REUNION_PREFIX + todayKey);
  if (savedId) {
    const t = thoughts.find((x) => x.id === savedId);
    if (t) return { thought: t, label: labelFor(t, todayKey) };
  }
  // 前回出した記録（今日より前で一番新しい日のキー）を探し、古いキーは片づける
  let lastId: string | null = null;
  let lastDate = "";
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const isPick = k.startsWith(REUNION_PREFIX);
      const isFlip = k.startsWith(REUNION_FLIPPED_PREFIX);
      if (!isPick && !isFlip) continue;
      const date = k.slice(isPick ? REUNION_PREFIX.length : REUNION_FLIPPED_PREFIX.length);
      if (date >= todayKey) continue;
      if (isPick && date > lastDate) {
        if (lastDate) stale.push(REUNION_PREFIX + lastDate);
        lastDate = date;
        lastId = localStorage.getItem(k);
      } else {
        stale.push(k);
      }
    }
    for (const k of stale) localStorage.removeItem(k);
  } catch {
    // localStorage が使えないときは避ける記録なしで選ぶ
  }
  const pick = pickReunion(thoughts, todayKey, lastId);
  if (pick) storageSet("local", REUNION_PREFIX + todayKey, pick.thought.id);
  return pick;
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const { profile, name } = useProfile();
  const reducedMotion = useReducedMotion();

  // 日付はクライアントで確定（ハイドレーション差異を避ける）
  const today = useSyncExternalStore(noopSubscribe, () => tokyoDateKey(new Date()), () => "");
  const hour = useSyncExternalStore(noopSubscribe, () => tokyoHour(new Date()), () => 12);
  const dateLabel = useMemo(() => {
    if (!today) return "";
    const { day, weekday } = splitDateHeading(new Date(`${today}T12:00:00+09:00`));
    return `${day} ${weekday}`;
  }, [today]);

  const weekKey = today ? weekKeyFor(today) : "";
  const dates = useMemo(() => (weekKey ? weekDates(weekKey) : []), [weekKey]);
  const { days } = useMoodRange(today ? addDays(weekKey, -LOOKBACK_DAYS) : "", today);

  // 全記録（再会カードと休み明けの判定に使う）
  const [thoughts, setThoughts] = useState<ThoughtSummary[] | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authedJsonOrNull(user, "/api/thoughts")
      .then((data: ThoughtsListResponse | null) => {
        if (!cancelled) setThoughts(data?.thoughts ?? []);
      })
      .catch(() => {
        if (!cancelled) setThoughts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const wroteDays = useMemo(() => new Set((thoughts ?? []).map((t) => t.date)), [thoughts]);
  /** 記録あり＝thoughts ∪ 気分（玉だけの日も1日に数える） */
  const recorded = useMemo(() => {
    const s = new Set(wroteDays);
    for (const d of days ?? []) if (d.mood !== null || d.records > 0) s.add(d.date);
    return s;
  }, [wroteDays, days]);

  const loaded = !!today && days !== null && thoughts !== null;
  const count = loaded ? weekRecordDays(recorded, today) : null;
  const welcomeBack = loaded && isWelcomeBack([...recorded].filter((d) => d < today), today);

  /* ---------- 一言の玉が便箋へ飛ぶ（/mood/write → ホーム） ---------- */
  const todaySlotRef = useRef<HTMLSpanElement>(null);
  const [flyMood, setFlyMood] = useState<MoodId | null>(null);
  const [popToday, setPopToday] = useState(false);
  const flyElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = storageGet("session", FLY_KEY);
    if (raw === null) return;
    storageSet("session", FLY_KEY, null);
    const n = Number(raw);
    // 外部（sessionStorage）からの合図を一度だけ state に移す
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isMoodId(n)) setFlyMood(n);
  }, []);

  /* ---------- 今週◯日の数字が回る ---------- */
  const [rollFrom, setRollFrom] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);
  const countHandled = useRef(false);

  const finishArrival = useCallback(
    (n: number | null) => {
      setPopToday(true);
      setRolled(true);
      vibrate([14, 24, 14]);
      sound("pop");
      if (n !== null && n > 0) setTimeout(() => showToast(`今週${n}日目。いい風だったね。`), 500);
    },
    []
  );

  useEffect(() => {
    if (count === null || countHandled.current) return;
    countHandled.current = true;
    const prevRaw = storageGet("session", COUNT_KEY);
    storageSet("session", COUNT_KEY, String(count));
    const prev = prevRaw === null ? null : Number(prevRaw);
    // 表示を始める値を決めるだけ（外部の保存値からの同期）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prev !== null && Number.isFinite(prev) && prev < count) setRollFrom(prev);
    else if (flyMood !== null && count > 0) setRollFrom(count - 1);
  }, [count, flyMood]);

  // 玉が飛ばないときは、少し待ってから回す（飛ぶときは着いたときに finishArrival が回す）
  useEffect(() => {
    if (rollFrom === null || flyMood !== null || rolled) return;
    const t = setTimeout(() => setRolled(true), 450);
    return () => clearTimeout(t);
  }, [rollFrom, flyMood, rolled]);

  // 玉を飛ばす（データが揃ってから。動きを減らす設定ではすぐ置く）
  useEffect(() => {
    if (flyMood === null || count === null) return;
    const slot = todaySlotRef.current;
    const fly = flyElRef.current;
    if (reducedMotion || !slot || !fly || typeof fly.animate !== "function") {
      setFlyMood(null);
      finishArrival(count);
      return;
    }
    const sr = slot.getBoundingClientRect();
    const sx = window.innerWidth / 2 - 60;
    const sy = window.innerHeight * 0.36 - 60;
    const ex = sr.left + sr.width / 2 - 60;
    const ey = sr.top + sr.height / 2 - 60;
    const sc = sr.width / 120;
    const anim = fly.animate(
      [
        { transform: `translate(${sx}px,${sy}px) scale(1.2) rotate(-12deg)`, opacity: 0 },
        { transform: `translate(${sx}px,${sy - 20}px) scale(1.1) rotate(0)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${ex}px,${ey}px) scale(${sc}) rotate(0)`, opacity: 1 },
      ],
      { duration: 900, easing: "cubic-bezier(.5,0,.2,1.15)", fill: "forwards" }
    );
    let done = false;
    anim.onfinish = () => {
      done = true;
      setFlyMood(null);
      finishArrival(count);
    };
    return () => {
      if (!done) anim.cancel();
    };
  }, [flyMood, count, reducedMotion, finishArrival]);

  /* ---------- 今日の1枚 ---------- */
  const reunion = useMemo<ReunionPick | null | undefined>(() => {
    if (!today || thoughts === null) return undefined;
    return resolveReunion(thoughts, today);
  }, [thoughts, today]);

  const [flippedOn, setFlippedOn] = useState<string | null>(null);
  const storedFlipped = useSyncExternalStore(
    noopSubscribe,
    () => (today ? storageGet("local", REUNION_FLIPPED_PREFIX + today) === "1" : false),
    () => false
  );
  const flipped = storedFlipped || (!!today && flippedOn === today);

  const onFlip = () => {
    if (flipped || !today) return;
    setFlippedOn(today);
    storageSet("local", REUNION_FLIPPED_PREFIX + today, "1");
    vibrate([10, 20, 16]);
    sound("chime");
    setTimeout(() => showToast("また明日、次の1枚が届くよ。"), 900);
  };

  const onConsult = (pick: ReunionPick) => {
    sound("pop");
    const draft = `${shortDate(pick.thought.date)}に書いたことについて、話したい`;
    router.push(`/search?draft=${encodeURIComponent(draft)}`);
  };

  /* ---------- 風の記録 ---------- */
  const [histOpen, setHistOpen] = useState(false);

  return (
    <main className={styles.screen}>
      <Greeting
        dateLabel={dateLabel}
        hello={hello(hour, welcomeBack)}
        name={name}
        count={count}
        rollFrom={rollFrom}
        rolled={rolled}
        hideCount={!!profile?.hideStreak}
        gear={<GearButton />}
      />

      <WeekBand
        dates={dates}
        todayKey={today}
        days={days}
        wroteDays={wroteDays}
        hideTodayBead={flyMood !== null}
        popToday={popToday}
        todayRef={todaySlotRef}
        onOpen={() => {
          vibrate(10);
          sound("rub");
          setHistOpen(true);
        }}
        onToday={() => {
          sound("tick");
          router.push("/mood?from=home");
        }}
      />

      <ReunionNote pick={reunion} flipped={flipped} onFlip={onFlip} onConsult={onConsult} />

      <LetterCard />

      {flyMood !== null && (
        <div ref={flyElRef} className={styles.fly} style={{ opacity: 0 }} aria-hidden="true">
          <Bead mood={flyMood} size={120} />
        </div>
      )}

      <HistorySheet open={histOpen} onClose={() => setHistOpen(false)} />
    </main>
  );
}
