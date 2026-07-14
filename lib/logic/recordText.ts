import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

/**
 * ベクトル化用の連結テキスト。6項目のみ（タイトル・チャット履歴は含めない。ARCHITECTURE.md 参照）。
 * ラベルは検索文脈に不要な注記（AIの気づき）を除いた素の項目名にする。
 */
export function buildEmbeddingText(record: ShapedRecord): string {
  return SHAPED_FIELDS.map(({ key, label }) => {
    const plainLabel = label.replace("（AIの気づき）", "");
    return `${plainLabel}：${record[key]}`;
  }).join("\n");
}
