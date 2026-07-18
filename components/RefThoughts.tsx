"use client";

import { useState } from "react";
import CenterModal from "./CenterModal";
import FairCopy from "./FairCopy";
import type { ShapedRecord } from "@/lib/db/types";

export type RefThought = ShapedRecord & { id: string; date: string };

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

/** メンターの返事に添える「読み返したページ」——根拠になった過去の記録の紙片。
 *  タップでノート紙面の中央モーダルを開く（文通スタイル。DESIGN §Search Page リデザイン） */
export default function RefThoughts({ refs }: { refs: RefThought[] }) {
  const [selected, setSelected] = useState<RefThought | null>(null);

  if (refs.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-[10.5px] tracking-[0.14em] text-ink-tertiary">読み返したページ</p>
      {refs.map((ref) => (
        <button
          key={ref.id}
          type="button"
          onClick={() => setSelected(ref)}
          className="paper-slip mt-1.5 flex w-full items-center gap-2 rounded-r-md border border-l-[3px] border-[rgba(107,92,63,0.2)] border-l-accent px-2.5 py-[7px] text-left"
        >
          <span className="flex-none font-serif text-[11px] text-ink-tertiary">
            {shortDate(ref.date)}
          </span>
          <span className="min-w-0 truncate font-serif text-[13px] text-ink">{ref.title}</span>
        </button>
      ))}

      {selected && (
        <CenterModal
          paper
          ariaLabel={selected.title}
          onClose={() => setSelected(null)}
          header={
            <>
              <p className="font-serif text-[13px] text-ink-secondary">
                {shortDate(selected.date)}
              </p>
              <h3 className="mt-1 font-serif text-base font-semibold text-primary">
                {selected.title}
              </h3>
            </>
          }
        >
          <div className="notebook-lines mt-3">
            <FairCopy value={{ ...selected, title: undefined }} />
          </div>
        </CenterModal>
      )}
    </div>
  );
}
