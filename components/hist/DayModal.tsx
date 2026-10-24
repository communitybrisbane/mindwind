"use client";

// 風の記録：月の日付をタップしたときの、その日の記録のモーダル（PLAN 74・DESIGN 7.7）。
// - 記録1件：そのまま ThoughtModal（67。本人の文章・深掘りの問いと答え・編集・削除）を開く
// - 記録が複数（今日は何件も書ける）：少し傾いた紙に、日付（緑の波線）と各記録の書き出しを付箋で並べ、タップで ThoughtModal
// - 記録0件：玉（なければ点線の輪）と、過去日なら「この日の日記を書く」→ /record?date=（今日なら /record）
// 本人の文章は rawText のまま表示する（書き換えない・要約しない）。

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThoughtModal from "@/components/thought/ThoughtModal";
import Bead, { BeadSlot } from "@/components/ui/Bead";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import type { ThoughtsListResponse } from "@/lib/api/contracts";
import type { MoodId, ThoughtSummary } from "@/lib/db/types";
import { MOODS } from "@/lib/logic/moods";
import { authedFetch, useUser } from "@/lib/db/useUser";
import { sound, vibrate } from "@/lib/ui/feedback";
import { WEEKDAYS } from "./MonthGrid";
import styles from "./hist.module.css";

type Props = {
  /** 開いている日（null なら閉じている） */
  date: string | null;
  today: string;
  /** その日の気分（useMoodRange の値） */
  mood: MoodId | null;
  /** その日の記録の件数（useMoodRange の値。0 なら取りに行かない） */
  records: number;
  onClose: () => void;
  /** 記録を編集・削除したあと（風の記録を取り直す） */
  onChanged: () => void;
};

/** 「10月23日（金）」 */
function dayHeading(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return `${m}月${d}日（${WEEKDAYS[wd]}）`;
}

type Load = { date: string; thoughts: ThoughtSummary[] | null; error: boolean };

export default function DayModal({ date, today, mood, records, onClose, onChanged }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const [load, setLoad] = useState<Load | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // 日が変わったら開いている記録を閉じる
  const [prevDate, setPrevDate] = useState(date);
  if (date !== prevDate) {
    setPrevDate(date);
    setOpenId(null);
    setLoad(null);
  }

  // その日の記録を取る（件数 0 の日は取らない）
  useEffect(() => {
    if (!date || !user || records === 0) return;
    let alive = true;
    (async () => {
      try {
        const res = await authedFetch(user, `/api/thoughts?date=${encodeURIComponent(date)}`);
        if (!res.ok) throw new Error(`GET /api/thoughts ${res.status}`);
        const data = (await res.json()) as ThoughtsListResponse;
        const list = data.thoughts.filter((t) => t.date === date);
        if (!alive) return;
        setLoad({ date, thoughts: list, error: false });
        // 1件だけならそのまま開く
        if (list.length === 1) setOpenId(list[0].id);
      } catch (e) {
        console.error("day thoughts fetch failed:", e);
        if (alive) setLoad({ date, thoughts: null, error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [date, user, records, nonce]);

  // Esc で閉じる（ThoughtModal が開いているときはそちらに任せる）
  useEffect(() => {
    if (!date || openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [date, openId, onClose]);

  const thoughts = load && load.date === date ? load.thoughts : null;
  const loading = !!date && records > 0 && !(load && load.date === date);
  const open = !!date;
  const opened = openId && thoughts ? (thoughts.find((t) => t.id === openId) ?? null) : null;
  const single = thoughts?.length === 1;

  const closeAll = useCallback(() => {
    setOpenId(null);
    onClose();
  }, [onClose]);

  // ThoughtModal を閉じる：1件だけの日はこの日のモーダルごと閉じる
  const closeThought = useCallback(() => {
    if (single) closeAll();
    else setOpenId(null);
  }, [single, closeAll]);

  const onSaved = useCallback(
    (t: ThoughtSummary) => {
      setLoad((prev) =>
        prev && prev.thoughts ? { ...prev, thoughts: prev.thoughts.map((x) => (x.id === t.id ? t : x)) } : prev
      );
      onChanged();
    },
    [onChanged]
  );

  const onDeleted = useCallback(
    (id: string) => {
      const rest = (thoughts ?? []).filter((t) => t.id !== id);
      setLoad((prev) => (prev ? { ...prev, thoughts: rest } : prev));
      setOpenId(null);
      onChanged();
      // 消して残りが無ければ、この日のモーダルも閉じる
      if (rest.length === 0) onClose();
    },
    [thoughts, onChanged, onClose]
  );

  const write = () => {
    if (!date) return;
    vibrate(10);
    sound("pon");
    router.push(date === today ? "/record" : `/record?date=${date}`);
  };

  // 記録1件の日は、ThoughtModal だけを見せる（この日の紙は出さない）
  const showSheet = open && !(single && opened);
  const writeLabel = date === today ? "今日の日記を書く" : "この日の日記を書く";
  const isEmpty = !loading && (records === 0 || (thoughts !== null && thoughts.length === 0));

  return (
    <>
      <div
        className={[styles.dayVeil, showSheet ? styles.show : ""].filter(Boolean).join(" ")}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAll();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={date ? `${dayHeading(date)}の記録` : undefined}
        aria-hidden={!showSheet}
        inert={!showSheet}
      >
        {date && (
          <div className={styles.dayInner}>
            <Paper className={styles.daySheet} rotate={-0.8}>
              <div className={styles.dayDate}>{dayHeading(date)}</div>

              {loading && <div className={styles.dayNote}>ひらいています…</div>}

              {!loading && load?.error && (
                <div className={styles.dayNote}>
                  読みこめませんでした。
                  <button type="button" className={styles.retry} onClick={() => setNonce((n) => n + 1)}>
                    もう一度
                  </button>
                </div>
              )}

              {isEmpty && !load?.error && (
                <div className={styles.dayEmpty}>
                  {mood != null ? <Bead mood={mood} size={64} /> : <BeadSlot size={56} />}
                  <div className={styles.dayNote}>
                    {mood != null ? `${MOODS[mood].name}の日。` : ""}
                    {date === today ? "今日はまだ書いていません。" : "この日は書いていません。"}
                  </div>
                </div>
              )}

              {!loading && thoughts && thoughts.length > 1 && (
                <ul className={styles.dayList}>
                  {thoughts.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={styles.daySlip}
                        onClick={() => {
                          vibrate(8);
                          sound("pop");
                          setOpenId(t.id);
                        }}
                      >
                        {t.mood != null && <Bead mood={t.mood} size={22} className={styles.slipBead} />}
                        <span className={styles.slipText}>{t.rawText}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Paper>

            <div className={styles.dayBtns}>
              <RoundButton icon="check" label="とじる" aria-label="とじる" size={62} onClick={closeAll} />
              {isEmpty && !load?.error && (
                <RoundButton
                  variant="green"
                  icon="book"
                  label={writeLabel}
                  aria-label={writeLabel}
                  size={72}
                  onClick={write}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {opened && <ThoughtModal thought={opened} onClose={closeThought} onSaved={onSaved} onDeleted={onDeleted} />}
    </>
  );
}
