"use client";

import CenterModal from "./CenterModal";
import ThoughtFields from "./ThoughtFields";
import type { ShapedRecord } from "@/lib/db/types";

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
    <CenterModal
      ariaLabel={`${m}月${d}日の記録`}
      onClose={onClose}
      header={
        <h3 className="text-base font-semibold text-ink">
          {y}年{m}月{d}日の記録
        </h3>
      }
    >
      <div className="mt-2 flex flex-col gap-6">
        {thoughts.map((thought) => (
          <div key={thought.id} className="border-t border-ceramic pt-4 first:border-t-0 first:pt-2">
            <h4 className="text-[15px] font-semibold text-primary">{thought.title}</h4>
            <div className="mt-3">
              <ThoughtFields thought={thought} />
            </div>
          </div>
        ))}
      </div>
    </CenterModal>
  );
}
