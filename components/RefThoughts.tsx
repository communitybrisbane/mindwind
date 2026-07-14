"use client";

import { useState } from "react";
import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

export type RefThought = ShapedRecord & { id: string; date: string };

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

/** AI 回答の下の「参考にした記録」チップ（2段階開示：チップ→一覧→中央モーダル） */
export default function RefThoughts({ refs }: { refs: RefThought[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RefThought | null>(null);

  if (refs.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-full border border-ceramic bg-white px-2.5 py-1 text-xs text-ink-secondary"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m21 11.5-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 0 1 5.7 5.7l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8" />
        </svg>
        参考にした記録 {refs.length}件
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-ceramic rounded-xl bg-white px-3 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
          {refs.map((ref) => (
            <li key={ref.id}>
              <button
                type="button"
                onClick={() => setSelected(ref)}
                className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left"
              >
                <span className="flex-none text-[13px] text-ink-secondary">{shortDate(ref.date)}</span>
                <span className="flex-1 truncate text-sm text-ink">{ref.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-label={selected.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-[398px] overflow-y-auto rounded-2xl bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-ink-secondary">{shortDate(selected.date)}</p>
                <h3 className="mt-1 text-base font-semibold text-ink">{selected.title}</h3>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 flex-none items-center justify-center text-ink-secondary"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {SHAPED_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[13px] font-semibold text-accent">{label}</p>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                    {selected[key]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
