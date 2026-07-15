"use client";

import Link from "next/link";
import { useState } from "react";
import { BlocksIcon } from "./icons";
import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

export type ThoughtItem = ShapedRecord & { id: string; date: string };

type Props = {
  thoughts: ThoughtItem[];
  onDelete: (id: string) => void;
};

/** "2026-07-15" → "7/15" */
function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

const MAX_ITEMS = 5;

export default function RecentThoughts({ thoughts, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const items = thoughts.slice(0, MAX_ITEMS);

  return (
    <section className="rounded-xl bg-white p-4 shadow-card">
      <h2 className="text-base font-semibold text-ink">最近の記録</h2>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-ink-secondary">
            まだ記録がありません。
            <br />
            今日のことを話してみよう
          </p>
          <Link
            href="/record"
            aria-label="記録する"
            className="mt-4 flex h-11 items-center justify-center rounded-2xl bg-primary px-8 text-white"
          >
            <BlocksIcon className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-ceramic">
          {items.map((thought) => {
            const expanded = expandedId === thought.id;
            return (
              <li key={thought.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : thought.id)}
                  className="flex min-h-11 w-full items-center gap-3 py-3 text-left"
                >
                  <span className="flex-none text-[13px] text-ink-secondary">
                    {shortDate(thought.date)}
                  </span>
                  <span className="flex-1 truncate text-base font-medium text-ink">
                    {thought.title}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 flex-none text-ink-tertiary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {expanded && (
                  <div className="pb-4">
                    <div className="flex flex-col gap-4">
                      {SHAPED_FIELDS.map(({ key, label }) => (
                        <div key={key}>
                          <p className="text-[13px] font-semibold text-accent">{label}</p>
                          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                            {thought[key]}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        aria-label="この記録を削除"
                        onClick={() => onDelete(thought.id)}
                        className="flex h-8 w-8 items-center justify-center text-ink-tertiary"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
