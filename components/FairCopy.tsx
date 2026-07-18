"use client";

import AutoGrowTextarea from "./AutoGrowTextarea";
import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

type Props = {
  /** ストリーミング中は部分オブジェクト（できた項目から表示） */
  value: Partial<ShapedRecord>;
  /** 編集可（成形完了後）。ストリーミング中は false */
  editable?: boolean;
  onChange?: (value: ShapedRecord) => void;
};

/**
 * 成形結果の「清書」。白カードにせず、ノートの罫線の上に直接展開する
 * （DESIGN §Recording Page リデザイン）。全テキストは行送り 34px で罫線に揃える。
 */
export default function FairCopy({ value, editable, onChange }: Props) {
  const fields = SHAPED_FIELDS.filter(({ key }) => editable || value[key] !== undefined);
  const showTitle = editable || value.title !== undefined;
  const update = (patch: Partial<ShapedRecord>) => {
    if (editable && onChange) onChange({ ...(value as ShapedRecord), ...patch });
  };

  return (
    <div>
      {showTitle && (
        <div>
          <p className="text-[11px] leading-[34px] tracking-[0.12em] text-ink-tertiary">タイトル</p>
          {editable ? (
            <AutoGrowTextarea
              value={value.title ?? ""}
              onChange={(text) => update({ title: text })}
              className="bg-transparent font-serif text-[19px] font-semibold leading-[34px] text-ink focus:outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap font-serif text-[19px] font-semibold leading-[34px] text-ink">
              {value.title}
            </p>
          )}
        </div>
      )}
      {fields.map(({ key, label }) => (
        <label key={key} className="block">
          <span className="text-[13px] font-semibold leading-[34px] text-accent">{label}</span>
          {editable ? (
            <AutoGrowTextarea
              value={value[key] ?? ""}
              onChange={(text) => update({ [key]: text })}
              className="bg-transparent font-serif text-[15px] leading-[34px] text-ink focus:outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap font-serif text-[15px] leading-[34px] text-ink">
              {value[key]}
            </p>
          )}
        </label>
      ))}
      {editable && (
        <p className="text-[11px] leading-[34px] tracking-[0.08em] text-ink-tertiary">
          項目をタップすると直せます
        </p>
      )}
    </div>
  );
}
