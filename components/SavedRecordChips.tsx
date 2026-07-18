"use client";

import { useState } from "react";
import FairCopy from "./FairCopy";
import { ChevronDownIcon } from "./icons";
import type { ShapedRecord } from "@/lib/db/types";
import type { RecordMessage } from "@/lib/logic/recordChatMessages";

type Props = {
  /** kind === "card" のメッセージだけを渡す */
  records: RecordMessage[];
  onDelete: (thoughtId: string) => void;
  onEdit: (thoughtId: string, shaped: ShapedRecord) => void;
};

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

/** 保存済み記録の「しおり」列（罫線ノートスタイル。タップで展開→読み取り専用＋編集/削除）。
 *  罫線と揃えるため、チップ行は 34px・展開内容は FairCopy（行送り34px）で組む */
export default function SavedRecordChips({ records, onDelete, onEdit }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (records.length === 0) return null;

  return (
    <div className="flex flex-none flex-col">
      {records.map((record, i) => {
        if (record.kind !== "card") return null;
        const isOpen = expanded === i;
        return (
          <div key={i}>
            <div className="flex h-[34px] items-center">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : i)}
                className="flex h-[30px] max-w-full items-center gap-2 rounded-r-lg border border-l-[3px] border-[rgba(107,92,63,0.2)] border-l-accent bg-white/65 pl-2.5 pr-3 text-left"
              >
                <span className="flex-none font-serif text-[12px] text-ink-tertiary">
                  {CIRCLED[i] ?? `${i + 1}.`}
                </span>
                <span className="min-w-0 truncate font-serif text-[14px] text-ink">
                  {record.shaped.title}
                </span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 flex-none text-ink-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {isOpen && (
              <div>
                <FairCopy value={{ ...record.shaped, title: undefined }} />
                <div className="flex h-[34px] items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onEdit(record.thoughtId, record.shaped)}
                    className="text-[13px] text-accent underline"
                  >
                    この記録を編集する
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(record.thoughtId)}
                    className="text-[13px] text-error underline"
                  >
                    この記録を削除する
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
