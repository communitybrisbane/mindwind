import { SHAPED_FIELDS, type ShapedRecord } from "@/lib/db/types";

/**
 * ベクトル化用の連結テキスト。6項目のみ（タイトル・チャット履歴は含めない。ARCHITECTURE.md 参照）。
 * ラベルは検索文脈に不要な注記（AIの気づき）を除いた素の項目名にする。
 */
export function buildEmbeddingText(record: ShapedRecord): string {
  return formatShapedFields(record);
}

/** 6項目を「項目名：内容」の行で連結する（ラベルから「（AIの気づき）」を除く）。RAG ブロックでも共用 */
export function formatShapedFields(record: Omit<ShapedRecord, "title">): string {
  return SHAPED_FIELDS.map(({ key, label }) => {
    const plainLabel = label.replace("（AIの気づき）", "");
    return `${plainLabel}：${record[key]}`;
  }).join("\n");
}
