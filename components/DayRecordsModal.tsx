"use client";

import Link from "next/link";
import CenterModal from "./CenterModal";
import ThoughtFields from "./ThoughtFields";
import { PencilIcon, TrashIcon } from "./icons";
import type { ShapedRecord } from "@/lib/db/types";

type Thought = ShapedRecord & { id: string; date: string };

type Props = {
  dateKey: string;
  todayKey: string;
  thoughts: Thought[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (thought: Thought) => void;
};

/**
 * カレンダーの日付タップで開く、その日の記録の中央モーダル。
 * 過去日の日記を書く入口と、古い記録の削除導線を兼ねる（docs/ARCHITECTURE.md「過去日付の記録」）：
 * - 記録0件の過去日：空状態＋「この日の日記を書く」→ /record?date=（過去日は1日1件まで）
 * - 記録ありの過去日：表示＋各記録の削除ボタン（追記ボタンは出さない）
 * - 今日：記録の有無に関わらず「今日の日記を書く」→ 通常の記録タブ
 */
export default function DayRecordsModal({ dateKey, todayKey, thoughts, onClose, onDelete, onEdit }: Props) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const isToday = dateKey === todayKey;
  const writeHref = isToday ? "/record" : `/record?date=${dateKey}`;
  const showWriteButton = isToday || thoughts.length === 0;

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
        {thoughts.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-secondary">
            この日の記録はまだありません
          </p>
        )}
        {thoughts.map((thought) => (
          <div key={thought.id} className="border-t border-ceramic pt-4 first:border-t-0 first:pt-2">
            <h4 className="text-[15px] font-semibold text-primary">{thought.title}</h4>
            <div className="mt-3">
              <ThoughtFields thought={thought} />
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <button
                type="button"
                aria-label="この記録を編集"
                onClick={() => onEdit(thought)}
                className="flex h-8 w-8 items-center justify-center text-ink-tertiary"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="この記録を削除"
                onClick={() => onDelete(thought.id)}
                className="flex h-8 w-8 items-center justify-center text-ink-tertiary"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {showWriteButton && (
          <div className="flex justify-center pb-2">
            <Link
              href={writeHref}
              className="flex h-11 items-center justify-center rounded-2xl bg-primary px-8 text-[15px] font-medium text-white"
            >
              {isToday ? "今日の日記を書く" : "この日の日記を書く"}
            </Link>
          </div>
        )}
      </div>
    </CenterModal>
  );
}
