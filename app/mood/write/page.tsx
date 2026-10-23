"use client";

// 一言（PLAN 64）。見た目と動きの正は docs/prototype/ui-v5.html「② 一言」。
// 長押しで封をして保存：POST /api/thoughts { rawText, kind: "quick" } → 封蝋（今日の玉の風の絵）→ /home。
// 空・2文字未満はトースト「一言だけ書いてから、長押ししてね」で保存しない。上限は limits の MAX_QUICK_LENGTH。
// 本文は書いたまま送る（AI は触らない）。玉が今週の便箋へ飛ぶ演出はホーム（72）が sessionStorage を見て行う。

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Bead from "@/components/ui/Bead";
import { Desk } from "@/components/ui/Desk";
import LimitCounter from "@/components/ui/LimitCounter";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import { showToast } from "@/components/ui/Toast";
import { WaxSeal, moodDateLabel } from "@/components/mood/Postmark";
import styles from "@/components/mood/mood.module.css";
import type { ApiError } from "@/lib/api/contracts";
import { authedJson, useUser } from "@/lib/db/useUser";
import { MAX_QUICK_LENGTH } from "@/lib/logic/limits";
import { MOODS } from "@/lib/logic/moods";
import { validateQuickText } from "@/lib/logic/quickRecord";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useLimitedInput } from "@/lib/ui/useLimitedInput";
import { useReducedMotion } from "@/lib/ui/useReducedMotion";
import { useTodayMood } from "@/lib/ui/useTodayMood";

const FLY_KEY = "mindwind:flyMood";
const EMPTY_TOAST = "一言だけ書いてから、長押ししてね";
const SEAL_MS = 1100;

type Spark = { id: number; dx: number; dy: number; color: string };

export default function MoodWritePage() {
  return (
    <AuthGuard>
      <QuickWrite />
    </AuthGuard>
  );
}

function errorMessage(code: ApiError["error"] | undefined): string {
  if (code === "daily_limit") return "今日の記録は上限に達しました";
  if (code === "too_short") return EMPTY_TOAST;
  if (code === "too_long") return `一言は${MAX_QUICK_LENGTH}文字までだよ`;
  return "保存できませんでした。少し待ってからもう一度試してください。";
}

function QuickWrite() {
  const router = useRouter();
  const { user } = useUser();
  const { mood, date } = useTodayMood();
  const reducedMotion = useReducedMotion();
  const input = useLimitedInput({ max: MAX_QUICK_LENGTH, label: "一言は" });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const [sealed, setSealed] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);

  // 開いたら書けるように（キーボードが上がる）
  useEffect(() => {
    const t = setTimeout(() => taRef.current?.focus({ preventScroll: true }), 400);
    return () => clearTimeout(t);
  }, []);

  const isEmpty = () => !validateQuickText(input.value).ok;

  // 長押しを始める前に、空なら止めてすぐ知らせる（プロトタイプどおり押した瞬間）
  const guardHold = (e: PointerEvent<HTMLDivElement>) => {
    if (busyRef.current) {
      e.stopPropagation();
      return;
    }
    if (isEmpty()) {
      e.stopPropagation();
      e.preventDefault();
      showToast(EMPTY_TOAST);
      vibrate(30);
    }
  };

  const seal = async () => {
    if (busyRef.current || !user) return;
    const v = validateQuickText(input.value);
    if (!v.ok) {
      showToast(v.error === "too_long" ? errorMessage("too_long") : EMPTY_TOAST);
      vibrate(30);
      return;
    }
    busyRef.current = true;
    taRef.current?.blur();
    setSealed(true);
    sound("seal");
    if (!reducedMotion) {
      const base = Date.now();
      setSparks(
        Array.from({ length: 16 }, (_, k) => {
          const a = Math.random() * Math.PI * 2;
          const d = 40 + Math.random() * 60;
          return {
            id: base + k,
            dx: Math.cos(a) * d,
            dy: Math.sin(a) * d - 20,
            color: ["#f0dca0", "#f4ecd8", "#c9b583"][k % 3],
          };
        }),
      );
    }

    const wait = new Promise((r) => setTimeout(r, reducedMotion ? 300 : SEAL_MS));
    try {
      // 本文は書いたまま送る（前後の空白はサーバーが整える）
      const res = await authedJson(user, "POST", "/api/thoughts", { rawText: input.value, kind: "quick" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(errorMessage(data?.error));
      }
      await wait;
      if (mood !== null) {
        try {
          sessionStorage.setItem(FLY_KEY, String(mood));
        } catch {
          // 演出が無くなるだけ
        }
      }
      router.push("/home");
    } catch (e) {
      await wait;
      showToast(e instanceof Error && e.message ? e.message : errorMessage(undefined));
      setSealed(false);
      setSparks([]);
      busyRef.current = false;
    }
  };

  const line = mood !== null ? MOODS[mood].line : "";

  return (
    <Desk className={styles.screen}>
      <div className={styles.writeScreen} style={{ position: "absolute", inset: 0 }}>
        <div className={styles.head}>
          {mood !== null && <Bead mood={mood} size={46} />}
          <div>
            <div className={styles.date}>{moodDateLabel(date)}</div>
            {line && <h1 className={styles.headLine}>{line}</h1>}
          </div>
        </div>

        <Paper className={`${styles.paper} ${sealed ? styles.sealed : ""} ${input.shaking ? "shake" : ""}`}>
          <textarea
            ref={taRef}
            className={styles.ta}
            value={input.value}
            onChange={input.onChange}
            aria-label="一言"
            readOnly={sealed}
            enterKeyHint="done"
          />
          <LimitCounter {...input.counter} className={styles.cnt} />
        </Paper>

        <div className={styles.holdRow}>
          <p className={styles.holdHint}>
            いまの気持ちを、一言だけ。
            <br />
            書けたら、右の印を長押し。
          </p>
          <div onPointerDownCapture={guardHold}>
            <RoundButton
              variant="green"
              icon="hanko"
              size={82}
              aria-label="長押しで保存"
              onHold={() => void seal()}
              disabled={sealed}
            />
          </div>
        </div>

        <WaxSeal mood={mood} playing={sealed} />
        {sparks.map((s) => (
          <i
            key={s.id}
            className={styles.spark}
            style={
              {
                left: "50%",
                top: 300,
                background: s.color,
                "--dx": `${s.dx}px`,
                "--dy": `${s.dy}px`,
              } as CSSProperties
            }
            aria-hidden="true"
          />
        ))}
      </div>
    </Desk>
  );
}
