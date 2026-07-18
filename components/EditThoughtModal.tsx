"use client";

import { useState } from "react";
import AutoGrowTextarea from "./AutoGrowTextarea";
import CenterModal from "./CenterModal";
import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";
import { MAX_SHAPED_FIELD, MAX_TITLE_LENGTH } from "@/lib/logic/limits";

type Props = {
  /** 編集前の値（タイトル＋6項目） */
  initial: ShapedRecord;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (shaped: ShapedRecord) => void;
};

/** 保存済み記録の編集モーダル（最近の記録・カレンダー・しおり共通）。
 *  保存すると編集後のテキストで embedding が作り直される（PUT /api/thoughts/[id]） */
export default function EditThoughtModal({ initial, saving, error, onClose, onSave }: Props) {
  const [value, setValue] = useState<ShapedRecord>(initial);
  const incomplete =
    !value.title.trim() || SHAPED_FIELDS.some(({ key }) => !value[key].trim());

  return (
    <CenterModal
      ariaLabel="記録を編集"
      onClose={onClose}
      header={<h3 className="text-base font-semibold text-ink">記録を編集</h3>}
    >
      <div className="mt-2 flex flex-col gap-4">
        <label className="block">
          <span className="text-[13px] font-semibold text-accent">タイトル</span>
          <AutoGrowTextarea
            value={value.title}
            onChange={(text) => setValue({ ...value, title: text.slice(0, MAX_TITLE_LENGTH) })}
            className="mt-2 rounded border border-[#d6dbde] bg-white px-2.5 py-2 text-[15px] font-medium leading-relaxed text-ink focus:border-accent focus:outline-none"
          />
        </label>
        {SHAPED_FIELDS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="text-[13px] font-semibold text-accent">{label}</span>
            <AutoGrowTextarea
              value={value[key]}
              onChange={(text) => setValue({ ...value, [key]: text.slice(0, MAX_SHAPED_FIELD) })}
              className="mt-2 rounded border border-[#d6dbde] bg-white px-2.5 py-2 text-[15px] leading-relaxed text-ink focus:border-accent focus:outline-none"
            />
          </label>
        ))}
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="button"
          onClick={() => onSave(value)}
          disabled={saving || incomplete}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-medium text-white disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </CenterModal>
  );
}
