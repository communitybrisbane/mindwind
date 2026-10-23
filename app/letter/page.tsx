"use client";

// 今週の手紙（PLAN 78・契約 §1 の /letter。?week=YYYY-MM-DD で過去の手紙）。
// 封筒 → テープをはがす → フタが開く → 親指で手紙を上へ引っぱり出す → 封筒は下へ落ち、
// 三つ折りの便箋が折り目で1枚ずつ開く → 下へスクロールして読む → 「とじる」「相談する」「過去の手紙」。
// 動きはプロトタイプ ui-v5.html の openLetter / peelOpen / pullOut の写し。「動きをへらす」では開いた便箋をすぐ出す。

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Envelope, { type EnvelopePhase } from "@/components/letter/Envelope";
import Letter3D, { LetterHead } from "@/components/letter/Letter3D";
import LetterList from "@/components/letter/LetterList";
import styles from "@/components/letter/letter.module.css";
import { Desk } from "@/components/ui/Desk";
import { RoundButton } from "@/components/ui/RoundButton";
import { markLetterRead, splitIntoPanels, useLetter, type LetterState } from "@/lib/db/useLetter";
import { useUser } from "@/lib/db/useUser";
import { isWeekKey } from "@/lib/logic/letterKey";
import { todayKeyOf } from "@/lib/logic/moodDay";
import { dayOfWeek, letterWeekFor, weekRange } from "@/lib/logic/week";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useDisplayName } from "@/lib/ui/useDisplayName";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";

const CONSULT_DRAFT = "先週の手紙のことで、聞きたいことがある";
const WEEKDAY = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"] as const;

/** 封筒の鉛筆書き（"10/25 日曜"） */
function envelopeNote(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return m && d ? `${m}/${d} ${WEEKDAY[dayOfWeek(dateKey)]}` : "";
}

function statusOf(s: LetterState): string {
  switch (s.kind) {
    case "loading":
      return "";
    case "locked":
      return `この週は${s.recordDays}日、書いてくれたね。\n${s.needed}日書いた週に、日曜日に手紙が届くよ`;
    case "generating":
      return "手紙を書いているよ…";
    case "missing":
      return "まだ手紙は届いていないよ\n日曜日に、この1週間のあなたの言葉が届くよ";
    case "error":
      return s.message;
    case "ready":
      return s.sample ? "（開発用のサンプルの手紙）" : "";
  }
}

export default function LetterPage() {
  return (
    <Desk className="flex min-h-0 flex-1 flex-col">
      <AuthGuard>
        <Suspense>
          <LetterPageBody />
        </Suspense>
      </AuthGuard>
    </Desk>
  );
}

function LetterPageBody() {
  const raw = useSearchParams().get("week");
  const week = isWeekKey(raw) ? raw : null;
  // 週が変わったら演出ごと最初から
  return <LetterScreen key={week ?? "current"} week={week} />;
}

function LetterScreen({ week }: { week: string | null }) {
  const router = useRouter();
  const { user } = useUser();
  const { name } = useDisplayName();
  const reduced = useReducedMotion();
  const { state } = useLetter(week);
  const letter = state.kind === "ready" ? state.letter : null;

  const [phase, setPhase] = useState<EnvelopePhase>("closed");
  const [listOpen, setListOpen] = useState(false);
  const ltrRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, []);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // 動きをへらす：封筒も折りたたみも飛ばして、開いた便箋をすぐ出す
  const eff: EnvelopePhase = reduced && letter ? "done" : phase;
  const unfolding = eff === "unfold" || eff === "done";
  const out = eff === "pulling" || unfolding;

  // 読み終えたら既読にする（サンプルは送らない）
  const readSent = useRef(false);
  useEffect(() => {
    if (eff !== "done" || !letter || !user || readSent.current) return;
    if (state.kind === "ready" && state.sample) return;
    if (letter.readAt) return;
    readSent.current = true;
    void markLetterRead(user, letter.weekKey);
  }, [eff, letter, user, state]);

  /* ---- テープをはがす → フタが開く → 手紙が顔を出す ---- */
  const peel = useCallback(() => {
    if (phase !== "closed" || !letter) return;
    setPhase("flap");
    vibrate([12, 24, 16]);
    sound("rub");
    later(750, () => {
      setPhase("peek");
      vibrate(8);
      sound("pop");
    });
    later(1300, () => setPhase("ready"));
  }, [phase, letter]);

  /* ---- 引っぱり出す → 便箋に引き継ぐ → 1枚ずつ開く ---- */
  const pullOut = useCallback(() => {
    const w = wrapRef.current;
    const L = letterRef.current;
    const T = ltrRef.current;
    if (!w || !L || !T || !letter) return;
    vibrate([14, 26, 18]);
    sound("chime");
    // 封筒の中の手紙のいまの位置を測って、同じ場所から本物の便箋（折りたたみ）に引き継ぐ
    w.scrollTop = 0;
    L.style.transition = "none";
    L.style.transform = "none";
    const lr = T.getBoundingClientRect();
    const Lr = L.getBoundingClientRect();
    const s0 = Lr.width > 0 ? lr.width / Lr.width : 0.65;
    L.style.transform = `translate(${lr.left - Lr.left}px, ${lr.top - Lr.top}px) scale(${s0})`;
    void L.offsetWidth;
    const s1 = 0.74;
    const tx = (w.clientWidth - L.offsetWidth * s1) / 2 - L.offsetLeft;
    const ty = (w.clientHeight - L.offsetHeight * s1) / 2 - L.offsetTop;
    requestAnimationFrame(() => {
      L.style.transition = "transform .8s cubic-bezier(.3,.9,.3,1)";
      L.style.transform = `translate(${tx}px, ${ty}px) scale(${s1})`;
    });
    setPhase("pulling");

    later(950, () => {
      setPhase("unfold");
      L.style.transition = "transform 1.8s cubic-bezier(.3,.9,.3,1)";
      L.style.transform = "none";
      [150, 1000].forEach((t) =>
        later(t, () => {
          vibrate([10, 18, 12]);
          sound("rub");
        })
      );
      letter.moods.slice(0, 7).forEach((m, k) => {
        if (m === null || m === undefined) return;
        later(500 + k * 120, () => {
          vibrate(8);
          sound("tick");
        });
      });
      later(2400, () => setPhase("done"));
    });
  }, [letter]);

  const close = () => {
    vibrate(12);
    sound("tick");
    router.push("/home");
  };
  const consult = () => {
    vibrate(12);
    sound("pop");
    router.push(`/search?draft=${encodeURIComponent(CONSULT_DRAFT)}`);
  };
  const openList = () => {
    vibrate(10);
    sound("pop");
    setListOpen(true);
  };

  const noteDate = letter ? letter.to : weekRange(week ?? letterWeekFor(todayKeyOf())).to;
  const headBlocks = letter ? splitIntoPanels(letter.blocks)[0] : [];
  const canOpen = state.kind === "ready";

  return (
    <div className={styles.stage}>
      {!(reduced && letter) && (
        <Envelope
          phase={eff}
          canOpen={canOpen}
          note={envelopeNote(noteDate)}
          status={statusOf(state)}
          taken={out}
          onPeel={peel}
          onPullOut={pullOut}
          ltrRef={ltrRef}
          preview={letter && <LetterHead letter={letter} name={name} blocks={headBlocks} showStamps={false} />}
        />
      )}

      {/* 封を開けるボタン（届いていないときは、もどる・過去の手紙だけ） */}
      <div className={`${styles.openArea} ${eff !== "closed" ? styles.hide : ""}`} style={{ gap: 34, alignItems: "flex-start" }}>
        <RoundButton
          variant="chalk"
          icon="arrowL"
          label="もどる"
          aria-label="ホームへもどる"
          onClick={close}
          className={canOpen ? styles.lactSide : undefined}
        />
        {canOpen && (
          <RoundButton variant="green" icon="envopen" size={80} aria-label="封をはがす" onClick={peel} />
        )}
        <RoundButton
          variant="chalk"
          icon="env"
          label="過去の手紙"
          aria-label="過去の手紙を見る"
          onClick={openList}
          className={canOpen ? styles.lactSide : undefined}
        />
      </div>

      <div ref={wrapRef} className={`${styles.sheetWrap} ${out ? styles.show : ""}`}>
        {letter && (
          <Letter3D
            ref={letterRef}
            letter={letter}
            name={name}
            folded={!unfolding}
            going={unfolding && !reduced}
            opened={unfolding}
            showStamps={unfolding}
          />
        )}
      </div>

      <div className={`${styles.lact} ${eff === "done" ? styles.show : ""}`}>
        <RoundButton icon="check" size={66} label="とじる" aria-label="閉じる" onClick={close} className={styles.lactSide} />
        <RoundButton
          variant="chalk"
          icon="env"
          label="過去の手紙"
          aria-label="過去の手紙を見る"
          onClick={openList}
          className={styles.lactSide}
        />
        <RoundButton variant="green" icon="plane" size={90} label="相談する" aria-label="この手紙のことを相談する" onClick={consult} />
      </div>

      <LetterList
        open={listOpen}
        currentWeek={letter?.weekKey ?? null}
        onClose={() => setListOpen(false)}
        onOpen={(wk) => {
          setListOpen(false);
          if (wk !== letter?.weekKey) router.push(`/letter?week=${wk}`);
        }}
        onDeleted={(wk) => {
          if (wk === letter?.weekKey) {
            setListOpen(false);
            router.replace("/home");
          }
        }}
      />
    </div>
  );
}
