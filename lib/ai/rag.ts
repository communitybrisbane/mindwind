// RAG 検索（サーバー側専用）：質問をベクトル化し、関連する過去記録を上位5件抽出する。
// 検索対象は thoughts のみ（会話履歴はベクトル化せず RAG に含めない。ARCHITECTURE.md 参照）

import { embedText } from "./embedding";
import { adminDb } from "@/lib/db/admin";
import type { ShapedRecord } from "@/lib/db/types";
import { topKSimilar } from "@/lib/logic/similarity";

export const MIN_THOUGHTS_FOR_CONSULT = 3;
export const RAG_TOP_K = 5;

export type RagThought = ShapedRecord & { id: string; date: string };

export async function searchRelevantThoughts(
  uid: string,
  query: string
): Promise<{ count: number; results: RagThought[] }> {
  const snap = await adminDb.collection(`users/${uid}/thoughts`).get();
  if (snap.size < MIN_THOUGHTS_FOR_CONSULT) return { count: snap.size, results: [] };

  const items = snap.docs
    .map((doc) => {
      const data = doc.data();
      if (!Array.isArray(data.embedding)) return null;
      const { embedding, rawText: _r, deepDiveQuestion: _q, deepDiveAnswer: _a, createdAt: _c, tags: _t, ...rest } = data;
      return { item: { id: doc.id, ...rest } as RagThought, embedding: embedding as number[] };
    })
    .filter((x) => x !== null);

  const queryEmbedding = await embedText(query);
  const top = topKSimilar(queryEmbedding, items, RAG_TOP_K);
  return { count: snap.size, results: top.map((t) => t.item) };
}
