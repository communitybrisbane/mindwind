"use client";

import { useState } from "react";
import ShapedCard from "./ShapedCard";
import { CheckIcon, ChevronDownIcon } from "./icons";
import type { RecordMessage } from "@/lib/logic/recordChatMessages";

type Props = {
  /** kind === "card" のメッセージだけを渡す */
  records: RecordMessage[];
  onDelete: (thoughtId: string) => void;
};

/** 保存済み記録のチップ列（タップで展開→読み取り専用カード＋削除リンク） */
export default function SavedRecordChips({ records, onDelete }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (records.length === 0) return null;

  return (
    <div className="flex flex-none flex-col gap-2 pt-3">
      {records.map((record, i) => {
        if (record.kind !== "card") return null;
        const isOpen = expanded === i;
        return (
          <div key={i}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setExpanded(isOpen ? null : i)}
              className="flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-left shadow-card"
            >
              <CheckIcon className="h-4 w-4 flex-none text-accent" />
              <span className="flex-1 truncate text-sm font-medium text-ink">
                {record.shaped.title}
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 flex-none text-ink-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="mt-2">
                <ShapedCard value={record.shaped} readOnly />
                <button
                  type="button"
                  onClick={() => onDelete(record.thoughtId)}
                  className="mx-auto mt-2 block text-[13px] text-error underline"
                >
                  この記録を削除する
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
