"use client";

import { useState } from "react";
import CenterModal from "./CenterModal";
import ThoughtFields from "./ThoughtFields";
import { PaperclipIcon } from "./icons";
import type { ShapedRecord } from "@/lib/db/types";

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
        <PaperclipIcon className="h-3 w-3" />
        参考にした記録 {refs.length}件
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-ceramic rounded-xl bg-white px-3 shadow-card">
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
        <CenterModal
          ariaLabel={selected.title}
          onClose={() => setSelected(null)}
          header={
            <>
              <p className="text-[13px] text-ink-secondary">{shortDate(selected.date)}</p>
              <h3 className="mt-1 text-base font-semibold text-ink">{selected.title}</h3>
            </>
          }
        >
          <div className="mt-4">
            <ThoughtFields thought={selected} />
          </div>
        </CenterModal>
      )}
    </div>
  );
}
