"use client";

// 気分の回転盤（PLAN 63）と決めたあとの3択（PLAN 64）。見た目と動きの正は docs/prototype/ui-v5.html「① 回転盤」。
// - 開いたら localStorage["mindwind:moodPromptedOn"] = 今日（その日の最初の1回だけ出すため。契約 §1）
// - 真ん中の玉をタップで決定 → PUT /api/mood（useTodayMood）→ 玉が真ん中へ飛び、インクの輪の消印 → 3択
// - ?from=home（ホームの今日の輪から）：決めたら /home へ戻る。3択は出さない
// - あとで（しおり）→ /home（気分は保存しない）／選び直す → 回転盤に戻る（決め直すと PUT で上書き）
// 風の雰囲気（84）には fxBus で知らせるだけ（決定＝burst。回す＝spin・止まる＝preview は MoodWheel）。

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Bead from "@/components/ui/Bead";
import { Desk } from "@/components/ui/Desk";
import { RoundButton } from "@/components/ui/RoundButton";
import { showToast } from "@/components/ui/Toast";
import MoodChoices from "@/components/mood/MoodChoices";
import MoodWheel from "@/components/mood/MoodWheel";
import Postmark, { moodDateLabel } from "@/components/mood/Postmark";
import styles from "@/components/mood/mood.module.css";
import { todayKeyOf } from "@/lib/logic/moodDay";
import { MOODS, type MoodId } from "@/lib/logic/moods";
import { sound, vibrate } from "@/lib/ui/feedback";
import { fxBus } from "@/lib/ui/fxBus";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";
import { useTodayMood } from "@/lib/ui/useTodayMood";
import { moodOfSlot } from "@/lib/ui/wheelPhysics";

const PROMPTED_KEY = "mindwind:moodPromptedOn";
const FLY_KEY = "mindwind:flyMood";
const BEAD_SIZE = 92;
/** 決めた玉が飛んでいく先（消印の輪の中心。基準フレームで y=300） */
const TARGET_Y = 300;

type Fly = { mood: MoodId; from: DOMRect };
type Ripple = { id: number; x: number; y: number; color: string; size: number };

export default function MoodPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <MoodScreen />
      </Suspense>
    </AuthGuard>
  );
}

/** ホームが玉を今週の便箋へ飛ばす合図（72 が読む） */
function markFlyMood(mood: MoodId) {
  try {
    sessionStorage.setItem(FLY_KEY, String(mood));
  } catch {
    // 使えなくても遷移は止めない
  }
}

function MoodScreen() {
  const router = useRouter();
  const fromHome = useSearchParams().get("from") === "home";
  const { date, setMood } = useTodayMood();
  const reducedMotion = useReducedMotion();

  const screenRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const leavingRef = useRef(false);

  const [picked, setPicked] = useState<MoodId | null>(null);
  const [fly, setFly] = useState<Fly | null>(null);
  const [inkGo, setInkGo] = useState(false);
  const [line, setLine] = useState("");
  const [lineShown, setLineShown] = useState(false);
  const [choicesUp, setChoicesUp] = useState(false);
  const [touched, setTouched] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // その日の最初の1回だけ出すための印
  useEffect(() => {
    try {
      localStorage.setItem(PROMPTED_KEY, todayKeyOf());
    } catch {
      // 使えない環境では毎回出るだけ
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const addRipple = useCallback(
    (x: number, y: number, color: string, size: number) => {
      const id = performance.now() + Math.random();
      setRipples((r) => [...r, { id, x, y, color, size }]);
      later(950, () => setRipples((r) => r.filter((p) => p.id !== id)));
    },
    [later],
  );

  const reset = useCallback(() => {
    clearTimers();
    setPicked(null);
    setFly(null);
    setInkGo(false);
    setLine("");
    setLineShown(false);
    setChoicesUp(false);
    fxBus.clear();
  }, [clearTimers]);

  const commit = useCallback(
    (index: number, rect: DOMRect) => {
      if (picked !== null || leavingRef.current) return;
      const mood = moodOfSlot(index);
      setPicked(mood);
      setFly({ mood, from: rect });
      vibrate([18, 30, 26]);
      sound("pon");

      const screen = screenRef.current;
      const cx = screen ? screen.clientWidth / 2 : 195;
      const motion = !reducedMotion;
      later(motion ? 380 : 0, () => fxBus.burst(mood));
      later(motion ? 420 : 0, () => setInkGo(true));
      later(motion ? 560 : 0, () => {
        addRipple(cx, TARGET_Y, MOODS[mood].color, 230);
        vibrate(14);
      });

      const save = setMood(mood);
      if (fromHome) {
        // 選び直し：保存できたらホームへ戻る（3択は出さない）
        save
          .then(() => {
            leavingRef.current = true;
            later(motion ? 900 : 200, () => router.push("/home"));
          })
          .catch(() => {
            showToast("気分を保存できなかったよ。もう一度えらんでね");
            reset();
          });
        later(motion ? 900 : 0, () => {
          setLine(MOODS[mood].line);
          setLineShown(true);
        });
        return;
      }
      save.catch(() => {
        showToast("気分を保存できなかったよ。もう一度えらんでね");
        reset();
      });
      later(motion ? 900 : 0, () => {
        setLine(MOODS[mood].line);
        setLineShown(true);
        setChoicesUp(true);
      });
    },
    [picked, reducedMotion, later, addRipple, setMood, fromHome, router, reset],
  );

  // 決めた玉が、盤の上から真ん中の紙へ飛ぶ
  useLayoutEffect(() => {
    const el = flyRef.current;
    const screen = screenRef.current;
    if (!fly || !el || !screen) return;
    const c = screen.getBoundingClientRect();
    const sx = fly.from.left - c.left + fly.from.width / 2 - BEAD_SIZE / 2;
    const sy = fly.from.top - c.top + fly.from.height / 2 - BEAD_SIZE / 2;
    const s0 = fly.from.width / BEAD_SIZE;
    const tx = c.width / 2 - BEAD_SIZE / 2;
    const ty = TARGET_Y - BEAD_SIZE / 2;
    const end = `translate(${tx}px, ${ty}px) scale(2.5) rotate(-6deg)`;
    if (reducedMotion || typeof el.animate !== "function") {
      el.style.transform = end;
      return;
    }
    el.style.transform = `translate(${sx}px, ${sy}px) scale(${s0})`;
    const anim = el.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) scale(${s0})` },
        { transform: `translate(${tx}px, ${ty + 30}px) scale(2.9) rotate(0deg)`, offset: 0.7 },
        { transform: end },
      ],
      { duration: 650, easing: "cubic-bezier(.3,.8,.3,1)", fill: "forwards" },
    );
    return () => anim.cancel();
  }, [fly, reducedMotion]);

  // メンターの一言を1文字ずつ（動きを減らすときは一度に）
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!line) return;
    if (reducedMotion) {
      const t = setTimeout(() => setTyped(line), 0);
      return () => clearTimeout(t);
    }
    let k = 0;
    const iv = setInterval(() => {
      k += 1;
      setTyped(line.slice(0, k));
      if (k >= line.length) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, [line, reducedMotion]);

  const undo = () => {
    vibrate(10);
    sound("rub");
    leavingRef.current = false;
    reset();
    setTyped("");
  };

  const skip = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    fxBus.clear();
    showToast("あとで押せます。ホームへ");
    later(500, () => router.push("/home"));
  };

  const goOne = () => {
    if (picked === null || leavingRef.current) return;
    leavingRef.current = true;
    vibrate(12);
    sound("pon");
    const screen = screenRef.current;
    const h = screen?.clientHeight ?? 844;
    addRipple((screen?.clientWidth ?? 390) / 2, h - 284 + 95, "#f0dca0", 90);
    later(260, () => router.push("/mood/write"));
  };

  const goFull = () => {
    if (picked === null || leavingRef.current) return;
    leavingRef.current = true;
    vibrate(12);
    sound("tick");
    router.push("/record");
  };

  const goHome = () => {
    if (picked === null || leavingRef.current) return;
    leavingRef.current = true;
    vibrate(12);
    sound("tick");
    markFlyMood(picked);
    router.push("/home");
  };

  const inkColor = picked !== null && MOODS[picked].key === "calm" ? "#e8dcbd" : "#f0dca0";
  const decided = picked !== null;

  return (
    <Desk className={styles.screen}>
      <div ref={screenRef} style={{ position: "absolute", inset: 0 }}>
        <div className={styles.top}>
          <div className={styles.date}>{moodDateLabel(date)}</div>
          <h1 className={styles.q} style={{ opacity: decided ? 0 : 1 }}>
            今日の気分は？
          </h1>
        </div>

        <Postmark dateKey={date} go={inkGo} color={inkColor} />

        <div className={`${styles.line} ${lineShown ? styles.show : ""}`} aria-live="polite">
          {lineShown ? typed : ""}
        </div>

        <div className={styles.hint} style={{ opacity: decided || touched ? 0 : 1 }}>
          まわして、まんなかの玉をタップ
        </div>

        <MoodWheel
          active={!decided}
          intro={!fromHome}
          reducedMotion={reducedMotion}
          onCommit={commit}
          onInteract={() => setTouched(true)}
        />

        {fly && (
          <div ref={flyRef} className={styles.fly} aria-hidden="true">
            <Bead mood={fly.mood} size={BEAD_SIZE} />
          </div>
        )}

        {ripples.map((r) => (
          <div
            key={r.id}
            className={styles.ripple}
            style={
              {
                left: r.x - r.size / 2,
                top: r.y - r.size / 2,
                width: r.size,
                height: r.size,
                "--rc": r.color,
              } as CSSProperties
            }
            aria-hidden="true"
          />
        ))}

        {!fromHome && <MoodChoices up={choicesUp} onOne={goOne} onFull={goFull} onLater={goHome} />}

        <div className={`${styles.corner} ${decided ? styles.hidden : ""}`}>
          <RoundButton variant="chalk" icon="bookmark" aria-label="あとで" onClick={skip} disabled={decided} />
        </div>
        <div className={`${styles.corner} ${decided ? "" : styles.hidden}`}>
          <RoundButton variant="chalk" icon="undo" aria-label="選び直す" onClick={undo} disabled={!decided} />
        </div>
      </div>
    </Desk>
  );
}
