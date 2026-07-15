"use client";

import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

type Thought = ShapedRecord & { id: string; date: string };

type Props = {
  dateKey: string;
  thoughts: Thought[];
  onClose: () => void;
};

/** カレンダーの日付タップで開く、その日の記録の中央モーダル */
export default function DayRecordsModal({ dateKey, thoughts, onClose }: Props) {
  const [y, m, d] = dateKey.split("-").map(Number);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`${m}月${d}日の記録`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-[398px] overflow-y-auto rounded-2xl bg-white p-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {y}年{m}月{d}日の記録
          </h3>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center text-ink-secondary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-6">
          {thoughts.map((thought) => (
            <div key={thought.id} className="border-t border-ceramic pt-4 first:border-t-0 first:pt-2">
              <h4 className="text-[15px] font-semibold text-primary">{thought.title}</h4>
              <div className="mt-3 flex flex-col gap-4">
                {SHAPED_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-[13px] font-semibold text-accent">{label}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                      {thought[key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
