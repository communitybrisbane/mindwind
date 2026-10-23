import Link from "next/link";

/** 記録ページの見出し（ヘッダー。罫線の外） */
export default function RecordHeader({
  phase,
  heading,
  targetDate,
  pageWord,
}: {
  phase: 1 | 2 | 3;
  heading: { day: string; weekday: string } | null;
  targetDate: string | null;
  pageWord: string;
}) {
  return (
    <div className="flex-none px-6 pb-2 pt-4">
      <div className="flex items-center justify-between text-[12px] tracking-[0.08em] text-ink-tertiary">
        <span>MindWind 日記</span>
        <span className="flex gap-1.5" aria-label={`ステップ${phase}／3`}>
          {([1, 2, 3] as const).map((step) => (
            <span
              key={step}
              className={`h-[3px] w-6 rounded-full ${step <= phase ? "bg-accent" : "bg-ceramic"}`}
            />
          ))}
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h1 className="font-serif text-[30px] font-semibold leading-none text-primary">
          {heading?.day ?? " "}
          <span className="ml-2.5 text-[15px] font-normal tracking-[0.1em] text-ink-secondary">
            {heading?.weekday ?? ""}
          </span>
        </h1>
        {targetDate && (
          <Link
            href="/record"
            className="text-[13px] text-ink-secondary underline"
          >
            今日に戻る
          </Link>
        )}
      </div>
      <p className="mt-1.5 text-[12px] tracking-[0.14em] text-ink-tertiary">
        — {pageWord}の{phase === 3 ? "清書" : "ページ"} —
      </p>
    </div>
  );
}
