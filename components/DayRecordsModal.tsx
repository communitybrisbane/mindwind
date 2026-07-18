"use client";

import Link from "next/link";
import CenterModal from "./CenterModal";
import FairCopy from "./FairCopy";
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
 * 過去ログもノートの紙面として見せる（紙色＋罫線・行送り34px。DESIGN §Recording Page リデザイン）。
 * 過去日の日記を書く入口と、古い記録の編集・削除の導線を兼ねる：
 * - 記録0件の過去日：空状態＋「この日の日記を書く」→ /record?date=（過去日は1日1件まで）
 * - 記録ありの過去日：表示＋各記録の編集・削除ボタン（追記ボタンは出さない）
 * - 今日：記録の有無に関わらず「今日の日記を書く」→ 通常の記録タブ
 */
export default function DayRecordsModal({ dateKey, todayKey, thoughts, onClose, onDelete, onEdit }: Props) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const isToday = dateKey === todayKey;
  const writeHref = isToday ? "/record" : `/record?date=${dateKey}`;
  const showWriteButton = isToday || thoughts.length === 0;

  return (
    <CenterModal
      paper
      ariaLabel={`${m}月${d}日の記録`}
      onClose={onClose}
      header={
        <h3 className="font-serif text-base font-semibold text-primary">
          {y}年{m}月{d}日の記録
        </h3>
      }
    >
      {/* 罫線はこのコンテナの背景。中の文字はすべて行送り34pxで罫線に揃える */}
      <div className="notebook-lines mt-2">
        {thoughts.length === 0 && (
          <p className="text-center font-serif text-sm leading-[34px] text-ink-secondary">
            この日の記録はまだありません
          </p>
        )}
        {thoughts.map((thought, i) => (
          <div key={thought.id} className={i > 0 ? "mt-[34px]" : ""}>
            <h4 className="font-serif text-[17px] font-semibold leading-[34px] text-primary">
              {thought.title}
            </h4>
            <FairCopy value={{ ...thought, title: undefined }} />
            <div className="flex h-[34px] items-center justify-end gap-1">
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
      </div>
      {showWriteButton && (
        <div className="flex justify-center pb-1 pt-4">
          <Link
            href={writeHref}
            className="flex h-11 items-center justify-center rounded-full border border-primary/40 bg-white/60 px-8 font-serif text-[15px] text-primary"
          >
            {isToday ? "今日の日記を書く ✦" : "この日の日記を書く ✦"}
          </Link>
        </div>
      )}
    </CenterModal>
  );
}
