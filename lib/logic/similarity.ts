// ベクトル類似度（RAG 検索用の純粋ロジック）

/** コサイン類似度（-1〜1）。長さ不一致・ゼロベクトルは 0 を返す */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** クエリベクトルに近い順に上位 k 件を返す（類似度付き） */
export function topKSimilar<T>(
  query: number[],
  items: { item: T; embedding: number[] }[],
  k: number
): { item: T; score: number }[] {
  return items
    .map(({ item, embedding }) => ({ item, score: cosineSimilarity(query, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
