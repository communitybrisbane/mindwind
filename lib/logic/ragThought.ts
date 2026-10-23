import type { ShapedRecord } from "@/lib/db/types";
import { omit } from "@/lib/logic/omit";

export type RagThought = ShapedRecord & { id: string; date: string };

/** RAG でモデルに渡さないフィールド（embedding・生の入力・深掘り・メタ情報） */
const RAG_OMIT_KEYS = ["embedding", "rawText", "deepDiveQuestion", "deepDiveAnswer", "createdAt", "tags"] as const;

/** Firestore の記録データを RAG 用の形にする（不要フィールドと距離フィールドを除く） */
export function toRagThought(id: string, data: Record<string, unknown>): RagThought {
  const rest = omit(data, [...RAG_OMIT_KEYS, "distance"]);
  return { id, ...rest } as RagThought;
}
