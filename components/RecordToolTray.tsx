import Link from "next/link";
import MicButton from "@/components/MicButton";
import { MAX_DIARY_LENGTH } from "@/lib/logic/limits";

const hints = [
  "何があった？",
  "どう考えた？",
  "なぜそうした？",
  "今の気持ちは？",
];

/** 文具トレー（タブバーの直上・紙の上に置く）：上限・マイクの案内、ヒント、マイク、完了ボタン */
export default function RecordToolTray({
  phase,
  isGuest,
  limitReached,
  dailyLimit,
  micError,
  inputDisabled,
  doneDisabled,
  setActiveInput,
  onInterim,
  onRecordingChange,
  onMicError,
  onDone,
}: {
  phase: 1 | 2 | 3;
  isGuest: boolean;
  limitReached: boolean;
  dailyLimit: number;
  micError: boolean;
  inputDisabled: boolean;
  doneDisabled: boolean;
  setActiveInput: (update: (prev: string) => string) => void;
  onInterim: (text: string) => void;
  onRecordingChange: (recording: boolean) => void;
  onMicError: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex-none px-5 pb-4 pt-3">
      {limitReached &&
        (isGuest ? (
          <p className="pb-2 text-[13px] text-ink-secondary">
            今日のゲストの上限に達しました。
            <Link
              href="/onboarding?edit=1"
              className="font-semibold text-accent underline"
            >
              Google アカウントと連携
            </Link>
            するともっと記録できます
          </p>
        ) : (
          <p className="pb-2 text-[13px] text-ink-secondary">
            今日の記録は上限（{dailyLimit}件）に達しました
          </p>
        ))}
      {micError && (
        <p className="pb-2 font-serif text-[13px] text-error">
          ※ マイクを使えませんでした。ブラウザのマイク許可を確認してね
        </p>
      )}
      {phase === 1 && !limitReached && (
        <div className="mb-3 flex gap-4 overflow-x-auto px-1 font-serif text-[12px] text-ink-tertiary">
          {hints.map((hint) => (
            <span
              key={hint}
              className="whitespace-nowrap border-b border-dotted border-ink-tertiary pb-0.5"
            >
              {hint}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        {phase !== 3 && (
          <>
            <MicButton
              large
              disabled={inputDisabled}
              onFinal={(t) =>
                setActiveInput((prev) => (prev + t).slice(0, MAX_DIARY_LENGTH))
              }
              onInterim={onInterim}
              onRecordingChange={onRecordingChange}
              onError={onMicError}
            />
            <span className="text-[12px] text-ink-tertiary">声でも書ける</span>
          </>
        )}
        <button
          type="button"
          onClick={onDone}
          disabled={doneDisabled}
          className={`ml-auto rounded-full border px-6 py-2.5 font-serif text-[15px] disabled:opacity-50 ${
            phase === 3
              ? "border-primary bg-primary text-white"
              : "border-primary/40 bg-white/60 text-primary"
          }`}
        >
          {phase === 3 ? "保存する ✦" : "書き終えた ✦"}
        </button>
      </div>
    </div>
  );
}
