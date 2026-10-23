// RAG 検索（サーバー側専用）：質問をベクトル化し、関連する過去記録を上位5件抽出する。
// 検索対象は thoughts のみ（会話履歴はベクトル化せず RAG に含めない。ARCHITECTURE.md 参照）
// まず Firestore Vector Search（findNearest）を試し、インデックス未作成・旧形式データが残る間は全件読みにフォールバックする

import { embedText } from "./embedding";
import { adminDb } from "@/lib/db/admin";
import { readEmbedding } from "@/lib/db/embeddingField";
import { MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";
import { toRagThought, type RagThought } from "@/lib/logic/ragThought";
import { topKSimilar } from "@/lib/logic/similarity";

export { MIN_THOUGHTS_FOR_CONSULT };
export type { RagThought };
export const RAG_TOP_K = 5;

let warnedIndexError = false;

/** ネイティブ検索。失敗・件数不足（旧形式の配列データは検索対象外）のときは null */
async function nativeSearch(
  uid: string,
  queryEmbedding: number[],
  expected: number
): Promise<RagThought[] | null> {
  try {
    const snap = await adminDb
      .collection(`users/${uid}/thoughts`)
      .findNearest({
        vectorField: "embedding",
        queryVector: queryEmbedding,
        limit: RAG_TOP_K,
        distanceMeasure: "COSINE",
      })
      .get();
    if (snap.size < expected) return null;
    return snap.docs.map((doc) => toRagThought(doc.id, doc.data()));
  } catch (e) {
    if (!warnedIndexError) {
      warnedIndexError = true;
      console.warn(
        "[rag] findNearest に失敗したため全件読みにフォールバックします。ベクトルインデックス未作成の可能性があります（docs/DEVELOPMENT.md 参照）:",
        e
      );
    }
    return null;
  }
}

async function fullScanSearch(uid: string, queryEmbedding: number[]): Promise<RagThought[]> {
  const snap = await adminDb.collection(`users/${uid}/thoughts`).get();
  const items = snap.docs.flatMap((doc) => {
    const data = doc.data();
    const embedding = readEmbedding(data.embedding);
    return embedding ? [{ item: toRagThought(doc.id, data), embedding }] : [];
  });
  return topKSimilar(queryEmbedding, items, RAG_TOP_K).map((t) => t.item);
}

export async function searchRelevantThoughts(
  uid: string,
  query: string
): Promise<{ count: number; results: RagThought[] }> {
  const countSnap = await adminDb.collection(`users/${uid}/thoughts`).count().get();
  const count = countSnap.data().count;
  if (count < MIN_THOUGHTS_FOR_CONSULT) return { count, results: [] };

  const queryEmbedding = await embedText(query);
  const native = await nativeSearch(uid, queryEmbedding, Math.min(count, RAG_TOP_K));
  if (native) return { count, results: native };
  return { count, results: await fullScanSearch(uid, queryEmbedding) };
}
