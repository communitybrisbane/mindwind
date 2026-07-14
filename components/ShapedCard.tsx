"use client";

import AutoGrowTextarea from "./AutoGrowTextarea";
import { PencilIcon } from "./icons";
import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

type Props = {
  value: ShapedRecord;
  onChange?: (value: ShapedRecord) => void;
  onSave?: () => void;
  saving?: boolean;
  /** 保存済み（読み取り専用＋バッジ表示） */
  readOnly?: boolean;
};

/** 成形結果のチャット内カード。全フィールド編集可・全文表示（省略なし） */
export default function ShapedCard({ value, onChange, onSave, saving, readOnly }: Props) {
  return (
    <div>
      <div className="rounded-xl bg-white p-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
        {readOnly && (
          <span className="mb-3 inline-block rounded bg-leaf px-2 py-[3px] text-xs text-primary">
            保存済み
          </span>
        )}
        <div className="flex flex-col gap-4">
          {SHAPED_FIELDS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-[13px] font-semibold text-accent">{label}</span>
              <AutoGrowTextarea
                value={value[key]}
                readOnly={readOnly}
                onChange={(text) => onChange?.({ ...value, [key]: text })}
                className="mt-2 rounded border border-[#d6dbde] bg-white px-2.5 py-2 text-[15px] leading-relaxed text-ink focus:border-accent focus:outline-none read-only:border-transparent read-only:px-0"
              />
            </label>
          ))}
        </div>
      </div>
      {!readOnly && (
        <button
          type="button"
          aria-label="保存する"
          onClick={onSave}
          disabled={saving}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-white disabled:opacity-60"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      )}
      {saving && <p className="mt-1.5 text-[13px] text-ink-secondary">保存中...</p>}
    </div>
  );
}

