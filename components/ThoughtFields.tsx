import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

/** 記録の6項目をラベル付きで縦に表示（読み取り専用・全文表示）。
 *  ホームの展開・参考記録モーダル・日付モーダルで共通の見え方にする */
export default function ThoughtFields({ thought }: { thought: ShapedRecord }) {
  return (
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
  );
}
