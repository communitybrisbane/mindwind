"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { CrisisNote } from "@/components/mood/CrisisNote";
import RecordSheet from "@/components/record/RecordSheet";
import { SealHoldButton, SealStamp } from "@/components/record/SealHold";
import styles from "@/components/record/record.module.css";
import ThoughtModal from "@/components/thought/ThoughtModal";
import { Desk } from "@/components/ui/Desk";
import { RoundButton } from "@/components/ui/RoundButton";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useRecordSession } from "./useRecordSession";

/** ?date= の読み取りに useSearchParams が必要なため Suspense で包み、
 * 日付切替（過去日 ⇄ 今日）で key を変えて書きかけの状態を確実にリセットする */
export default function RecordPage() {
  return (
    <Suspense>
      <RecordPageBody />
    </Suspense>
  );
}

function RecordPageBody() {
  const dateParam = useSearchParams().get("date");
  return <RecordSession key={dateParam ?? "today"} dateParam={dateParam} />;
}

function RecordSession({ dateParam }: { dateParam: string | null }) {
  const s = useRecordSession(dateParam);
  const [openId, setOpenId] = useState<string | null>(null);
  const { step, mic } = s;

  const counter = step === 1 ? s.diary.counter : s.answer.counter;

  let hint: ReactNode;
  if (s.limitReached) {
    hint = s.isGuest ? (
      <>
        今日のゲストの上限です。<Link href="/settings">Googleでつなぐ</Link>ともっと書けるよ
      </>
    ) : (
      `今日の記録は上限（${s.dailyLimit}件）に達しました`
    );
  } else if (s.dateTaken) {
    hint = "この日はもう書いてあるよ。しおりから読み返せるよ";
  } else if (mic.recording) {
    hint = "聞き取り中…話してみて";
  } else if (step === 1) {
    hint = s.asking ? "メンターが読んでいるよ…" : "書き終えたら、右の矢印をタップ";
  } else if (step === 2) {
    hint = "答えを書いて、右の印を長押し（とばしてもいいよ）";
  }

  const marks =
    s.cards.length > 0 ? (
      <div className={styles.marks} aria-label="保存した記録">
        {s.cards.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.mark}
            aria-label={`保存した記録「${c.title || c.rawText.slice(0, 20)}」を開く`}
            onClick={() => {
              vibrate(8);
              sound("rub");
              setOpenId(c.id);
            }}
          >
            {c.title || c.rawText.slice(0, 20)}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <Desk stitch={false} className={styles.screen}>
      <div className={styles.top}>
        <div>
          <div className={styles.date}>{s.heading ? `${s.heading.day} ${s.heading.weekday}` : " "}</div>
          <div className={styles.title}>{s.pageWord}の1ページ</div>
          {s.targetDate && (
            <Link href="/record" className={styles.back}>
              今日に戻る
            </Link>
          )}
        </div>
        <div className={styles.steps} aria-label="日記・深掘り・保存" role="img">
          <i className={styles.on} />
          <i className={step >= 2 ? styles.on : undefined} />
          <i className={step >= 3 ? styles.on : undefined} />
        </div>
      </div>

      <RecordSheet
        step={step}
        diary={{ value: s.displayDiary, onChange: s.diary.onChange, shaking: s.diary.shaking }}
        answer={{ value: s.displayAnswer, onChange: s.answer.onChange, shaking: s.answer.shaking }}
        question={s.question}
        note={s.note}
        error={s.error}
        onDismissError={() => s.setError("")}
        readOnly={s.blocked || s.asking || s.sealing || mic.recording}
        placeholder={`${s.pageWord}は何があった？ 思いつくままに…`}
        answerPlaceholder="ここに答えを書いてね…"
        counter={counter}
        sunk={s.sealing}
        top={marks}
        overlay={<SealStamp mood={s.sealMood} playing={s.sealing} />}
      />

      <div className={styles.tray}>
        <div className={styles.hint} aria-live="polite">
          {hint}
        </div>
        {mic.supported && step !== 3 && (
          <div className={[styles.mic, mic.recording ? styles.recording : ""].filter(Boolean).join(" ")}>
            <RoundButton
              variant="chalk"
              icon="mic"
              size={66}
              aria-label={mic.recording ? "録音を止める" : "音声で書く"}
              onClick={mic.toggle}
              disabled={s.blocked || s.asking || s.sealing}
            />
          </div>
        )}
        {step >= 2 && (
          <div className={styles.skip}>
            <RoundButton
              variant="chalk"
              icon="arrow"
              size={58}
              label="とばす"
              aria-label="質問をとばす"
              onClick={() => {
                sound("tick");
                void s.seal(true);
              }}
              disabled={s.sealing}
            />
          </div>
        )}
        <div className={styles.main}>
          {step === 1 ? (
            <RoundButton
              variant="green"
              icon="arrow"
              size={98}
              label="書き終えた"
              aria-label="書き終えた"
              onClick={() => void s.finishDiary()}
              disabled={s.blocked || s.asking}
            />
          ) : (
            <SealHoldButton onSeal={() => void s.seal(false)} disabled={s.sealing} />
          )}
        </div>
      </div>

      <ThoughtModal
        open={openId !== null}
        thoughts={s.cards}
        initialId={openId ?? undefined}
        onClose={() => setOpenId(null)}
        onUpdated={s.onCardUpdated}
        onDeleted={(id) => {
          s.onCardDeleted(id);
        }}
      />
      {/* 保存した文章に危機の言葉があったとき（PLAN 85・憲法第8条）。読んでからホームへ */}
      <CrisisNote open={s.crisis} onDone={s.finishCrisis} />
    </Desk>
  );
}
