// RAG 検索（サーバー側専用・PLAN 58）：質問をベクトル化し、本人の言葉のチャンク（users/{uid}/chunks）を検索して、
// 記録単位にまとめた上位5件を返す。会話履歴・手紙・気分はベクトル化せず RAG に含めない（ARCHITECTURE.md 参照）。
//
// 検索の順：
//   1. chunks への findNearest（ベクトルインデックスが要る。DEVELOPMENT.md のコマンド）
//   2. 失敗（インデックス未作成など）なら chunks を全件読んでメモリで類似度を計算
//   3. その人に chunks が1つも無い（移行前）なら、旧 thoughts.embedding の検索（移行が済めば使われない）
// 各段階の時間を返し、相談 API がログに出す。

import { embedText } from "./embedding";
import { adminDb } from "@/lib/db/admin";
import { chunkCollectionPath } from "@/lib/db/chunks";
import { readEmbedding } from "@/lib/db/embeddingField";
import { MIN_THOUGHTS_FOR_CONSULT } from "@/lib/logic/limits";
import {
  cosineDistanceToSimilarity,
  groupChunkHits,
  RAG_CHUNK_LIMIT,
  RAG_TOP_K,
  type ChunkHit,
} from "@/lib/logic/ragChunks";
import { legacyToRagThought, type RagThought } from "@/lib/logic/ragThought";
import { cosineSimilarity, topKSimilar } from "@/lib/logic/similarity";
import { autoTitle } from "@/lib/logic/title";

export { MIN_THOUGHTS_FOR_CONSULT, RAG_TOP_K };
export type { RagThought };

export type RagSource = "chunks" | "chunks-scan" | "legacy" | "legacy-scan" | "none";

export type RagSearchResult = {
  /** 記録（thoughts）の件数。MIN_THOUGHTS_FOR_CONSULT 未満なら results は空 */
  count: number;
  results: RagThought[];
  /** どの経路で見つけたか（ログ用） */
  source: RagSource;
  /** 計測（ms） */
  timing: { embedMs: number; searchMs: number };
};

let warnedChunkIndex = false;
let warnedLegacyIndex = false;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function toHit(data: Record<string, unknown>, similarity: number): ChunkHit {
  return {
    thoughtId: str(data.thoughtId),
    date: str(data.date),
    text: str(data.text),
    order: num(data.order),
    similarity,
  };
}

/** chunks へのネイティブ検索。インデックス未作成などで失敗したら null */
async function nativeChunkSearch(uid: string, queryEmbedding: number[]): Promise<ChunkHit[] | null> {
  try {
    const snap = await adminDb
      .collection(chunkCollectionPath(uid))
      .findNearest({
        vectorField: "embedding",
        queryVector: queryEmbedding,
        limit: RAG_CHUNK_LIMIT,
        distanceMeasure: "COSINE",
        distanceResultField: "distance",
      })
      .get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return toHit(data, cosineDistanceToSimilarity(num(data.distance)));
    });
  } catch (e) {
    if (!warnedChunkIndex) {
      warnedChunkIndex = true;
      console.warn(
        "[rag] chunks の findNearest に失敗したため全件読みにフォールバックします。ベクトルインデックス（chunks・embedding）未作成の可能性があります（docs/DEVELOPMENT.md 参照）:",
        e
      );
    }
    return null;
  }
}

/** chunks を全件読み、メモリで類似度を計算する（インデックスが無い間の代替） */
async function scanChunkSearch(uid: string, queryEmbedding: number[]): Promise<ChunkHit[]> {
  const snap = await adminDb.collection(chunkCollectionPath(uid)).get();
  const hits: ChunkHit[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const embedding = readEmbedding(data.embedding);
    if (!embedding) continue;
    hits.push(toHit(data, cosineSimilarity(queryEmbedding, embedding)));
  }
  return hits.sort((a, b) => b.similarity - a.similarity).slice(0, RAG_CHUNK_LIMIT);
}

/** 旧 thoughts.embedding への検索（移行前の人だけ）。ネイティブ → 全件読み */
async function legacySearch(
  uid: string,
  queryEmbedding: number[],
  expected: number
): Promise<{ results: RagThought[]; source: RagSource }> {
  const col = adminDb.collection(`users/${uid}/thoughts`);
  try {
    const snap = await col
      .findNearest({
        vectorField: "embedding",
        queryVector: queryEmbedding,
        limit: RAG_TOP_K,
        distanceMeasure: "COSINE",
      })
      .get();
    if (snap.size >= expected) {
      return { results: snap.docs.map((doc) => legacyToRagThought(doc.id, doc.data())), source: "legacy" };
    }
  } catch (e) {
    if (!warnedLegacyIndex) {
      warnedLegacyIndex = true;
      console.warn("[rag] 旧 thoughts の findNearest に失敗したため全件読みにフォールバックします:", e);
    }
  }
  const snap = await col.get();
  const items = snap.docs.flatMap((doc) => {
    const data = doc.data();
    const embedding = readEmbedding(data.embedding);
    return embedding ? [{ item: legacyToRagThought(doc.id, data), embedding }] : [];
  });
  return { results: topKSimilar(queryEmbedding, items, RAG_TOP_K).map((t) => t.item), source: "legacy-scan" };
}

async function hasAnyChunk(uid: string): Promise<boolean> {
  const snap = await adminDb.collection(chunkCollectionPath(uid)).limit(1).get();
  return !snap.empty;
}

/** 画面の付箋用の題（本文の先頭から。AI には渡さない） */
function withTitles(results: RagThought[]): RagThought[] {
  return results.map((t) => (t.title ? t : { ...t, title: autoTitle(t.quote) }));
}

export async function searchRelevantThoughts(uid: string, query: string): Promise<RagSearchResult> {
  const countSnap = await adminDb.collection(`users/${uid}/thoughts`).count().get();
  const count = countSnap.data().count;
  if (count < MIN_THOUGHTS_FOR_CONSULT) {
    return { count, results: [], source: "none", timing: { embedMs: 0, searchMs: 0 } };
  }

  const t0 = Date.now();
  const queryEmbedding = await embedText(query);
  const t1 = Date.now();

  let source: RagSource = "chunks";
  let hits = await nativeChunkSearch(uid, queryEmbedding);
  if (hits === null) {
    source = "chunks-scan";
    hits = await scanChunkSearch(uid, queryEmbedding);
  }

  let results: RagThought[];
  if (hits.length === 0 && !(await hasAnyChunk(uid))) {
    // 移行前（チャンクが1つも無い）の人だけ、旧 thoughts.embedding を見る
    const legacy = await legacySearch(uid, queryEmbedding, Math.min(count, RAG_TOP_K));
    results = legacy.results;
    source = legacy.source;
  } else {
    results = withTitles(groupChunkHits(hits));
  }
  const t2 = Date.now();

  return { count, results, source, timing: { embedMs: t1 - t0, searchMs: t2 - t1 } };
}
