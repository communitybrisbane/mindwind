// チャンク検索の結果を「記録単位の参考記録」にまとめる純粋ロジック（PLAN 58。Vitest 対象）。
// - チャンクを記録（thoughtId）ごとにまとめ、最も高い類似度で並べて上位 topK 件
// - しきい値未満のチャンクは落とす（無関係な質問に無関係な記録を付けない）
// - 各記録は当たったチャンクを order 順に改行でつなぐ。長いときはチャンクの境界で切る（文の途中で切らない）
// - meta は受け取らない（AI にも画面にも出さない。契約 §5）
import type { RagThought } from "@/lib/logic/ragThought";

export type ChunkHit = {
  thoughtId: string;
  date: string;
  text: string;
  order: number;
  /** コサイン類似度（0〜1。距離 d のときは 1 - d） */
  similarity: number;
};

/** 参考記録の件数（記録単位） */
export const RAG_TOP_K = 5;

/** 上位 5 記録を集めるためにチャンクを何件まで取るか（1記録に複数チャンクが当たる分の余裕） */
export const RAG_CHUNK_LIMIT = 20;

/**
 * 参考記録に含める最低のコサイン類似度（text-embedding-3-small）。
 * 日本語の無関係な文どうしはおおむね 0.1〜0.25、同じ話題は 0.4 前後から。0.3 を既定にして、計測結果を見て調整する。
 */
export const RAG_MIN_SIMILARITY = 0.3;

/** 1記録あたり AI に渡す本人の言葉の上限（字）。チャンクの境界で切る */
export const RAG_MAX_CHARS_PER_THOUGHT = 800;

/** Firestore の COSINE 距離（0〜2）を類似度（-1〜1）にする */
export function cosineDistanceToSimilarity(distance: number): number {
  return 1 - distance;
}

export type GroupOptions = {
  topK?: number;
  minSimilarity?: number;
  maxChars?: number;
};

/** チャンクの当たりを記録ごとにまとめる */
export function groupChunkHits(hits: ChunkHit[], options: GroupOptions = {}): RagThought[] {
  const topK = options.topK ?? RAG_TOP_K;
  const minSimilarity = options.minSimilarity ?? RAG_MIN_SIMILARITY;
  const maxChars = options.maxChars ?? RAG_MAX_CHARS_PER_THOUGHT;

  const byThought = new Map<string, { date: string; best: number; chunks: ChunkHit[] }>();
  for (const hit of hits) {
    if (!(hit.similarity >= minSimilarity)) continue;
    const entry = byThought.get(hit.thoughtId);
    if (entry) {
      entry.best = Math.max(entry.best, hit.similarity);
      if (!entry.chunks.some((c) => c.order === hit.order)) entry.chunks.push(hit);
    } else {
      byThought.set(hit.thoughtId, { date: hit.date, best: hit.similarity, chunks: [hit] });
    }
  }

  return [...byThought.entries()]
    .sort((a, b) => b[1].best - a[1].best)
    .slice(0, topK)
    .map(([thoughtId, { date, best, chunks }]) => ({
      id: thoughtId,
      date,
      title: "",
      quote: joinChunks(chunks, maxChars),
      similarity: best,
    }));
}

/** order 順に改行でつなぐ。上限を超えるときはチャンクの境界で止める（最初の1つは必ず入れる） */
export function joinChunks(chunks: Pick<ChunkHit, "text" | "order">[], maxChars: number): string {
  const sorted = [...chunks].sort((a, b) => a.order - b.order);
  const parts: string[] = [];
  let total = 0;
  for (const c of sorted) {
    const add = c.text.length + (parts.length ? 1 : 0);
    if (parts.length > 0 && total + add > maxChars) break;
    parts.push(c.text);
    total += add;
  }
  return parts.join("\n");
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "2026-10-20" → "2026-10-20（火）"。形式が違えばそのまま */
export function dateWithWeekday(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const w = WEEKDAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()];
  return `${dateKey}（${w}）`;
}

export const RAG_BLOCK_HEADING = "【参考：ユーザーの過去の記録（本人の言葉・関連順・最大5件）】";

/** 関連する記録が無かったときに渡す一行（空の参考ブロックを渡さず、無いことを正直に伝える。憲法第4条2項） */
export const RAG_EMPTY_LINE = "（今回の相談に関連する記録は見つからなかった。根拠にできる記録が無いことを正直に伝えること）";

/**
 * AI に渡す参考ブロック（messages の末尾・user。docs/drafts/mentor-prompt-v5-drafts.md §2 の形）。
 * タイトルは渡さない（本文の先頭と重なるだけ）。meta も渡さない。
 */
export function formatRagBlock(thoughts: RagThought[]): string {
  if (thoughts.length === 0) return `${RAG_BLOCK_HEADING}\n\n${RAG_EMPTY_LINE}`;
  const entries = thoughts.map((t, i) => `${i + 1}. ${dateWithWeekday(t.date)}\n${t.quote}`);
  return `${RAG_BLOCK_HEADING}\n\n${entries.join("\n\n")}`;
}
