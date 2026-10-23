// 記録のチャンク（users/{uid}/chunks/{thoughtId}_{order}）の作成・置き換え・削除（サーバー専用）。
// text は本人の言葉そのまま（lib/logic/chunk.ts が分けるだけ）。書き換えない。
// Firestore のインスタンスは引数で受ける（admin の初期化を import しない＝純粋な部分を Vitest で試せる）。
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { embedTexts } from "@/lib/ai/embedding";
import type { ThoughtKind } from "@/lib/db/types";
import { splitIntoChunks, type ChunkPiece } from "@/lib/logic/chunk";
import type { MoodId } from "@/lib/logic/moods";
import { quickMeta } from "@/lib/logic/quickRecord";
import { embeddingInput } from "@/lib/logic/recordText";

/** users/{uid}/chunks。users/{uid} の下にあるので、アカウント削除の recursiveDelete で一緒に消える */
export function chunkCollectionPath(uid: string): string {
  return `users/${uid}/chunks`;
}

/** チャンクの id は `${thoughtId}_${order}` で決め打ち（編集時は同じ id に上書きする） */
export function chunkId(thoughtId: string, order: number): string {
  return `${thoughtId}_${order}`;
}

export type ChunkSourceInput = {
  thoughtId: string;
  date: string;
  rawText: string;
  deepDiveQuestion: string;
  deepDiveAnswer: string;
  kind: ThoughtKind;
  mood?: MoodId;
};

/** embedding の前の1チャンク分（meta は quick だけ。full の meta は 57 が裏で足す） */
export type PlannedChunk = ChunkPiece & { id: string; thoughtId: string; date: string; meta?: string };

/** 記録からチャンクの計画を作る（純粋）。text は splitIntoChunks の結果をそのまま使う */
export function planChunks(input: ChunkSourceInput): PlannedChunk[] {
  const meta = input.kind === "quick" ? quickMeta(input.mood) : undefined;
  return splitIntoChunks(input).map((piece) => ({
    ...piece,
    id: chunkId(input.thoughtId, piece.order),
    thoughtId: input.thoughtId,
    date: input.date,
    ...(meta ? { meta } : {}),
  }));
}

export type PreparedChunk = PlannedChunk & { embedding: number[] };

/** チャンクごとに embedding を作る（AI 呼び出し。トランザクションの外で呼ぶ） */
export async function prepareChunks(
  input: ChunkSourceInput,
  embed: (texts: string[]) => Promise<number[][]> = embedTexts
): Promise<PreparedChunk[]> {
  const planned = planChunks(input);
  const vectors = await embed(planned.map((c) => embeddingInput(c.text, c.meta)));
  if (vectors.length !== planned.length) throw new Error("embedding count mismatch");
  return planned.map((c, i) => ({ ...c, embedding: vectors[i] }));
}

/** Firestore に書く形（id は doc id なので中身には入れない） */
export function chunkDocData(chunk: PreparedChunk, vector: (v: number[]) => unknown) {
  return {
    thoughtId: chunk.thoughtId,
    date: chunk.date,
    text: chunk.text,
    source: chunk.source,
    order: chunk.order,
    embedding: vector(chunk.embedding),
    ...(chunk.meta ? { meta: chunk.meta } : {}),
  };
}

/** いまある id のうち、新しいチャンクに含まれないもの（編集で短くなったときに消す分） */
export function staleChunkIds(existingIds: Iterable<string>, nextIds: Iterable<string>): string[] {
  const keep = new Set(nextIds);
  return [...existingIds].filter((id) => !keep.has(id));
}

/** その記録のチャンクを読む（トランザクション内。読み取りは書き込みより先に呼ぶこと） */
export async function getChunkIdsInTx(tx: Transaction, db: Firestore, uid: string, thoughtId: string): Promise<string[]> {
  const snap = await tx.get(db.collection(chunkCollectionPath(uid)).where("thoughtId", "==", thoughtId));
  return snap.docs.map((d) => d.id);
}

/**
 * チャンクを書き、余った古いチャンクを消す（トランザクション内）。
 * existingIds は getChunkIdsInTx で先に読んだもの（新規保存なら []）。
 */
export function writeChunks(
  tx: Transaction,
  db: Firestore,
  uid: string,
  chunks: PreparedChunk[],
  existingIds: string[] = []
): void {
  const col = db.collection(chunkCollectionPath(uid));
  for (const c of chunks) {
    tx.set(col.doc(c.id), {
      ...chunkDocData(c, (v) => FieldValue.vector(v)),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  for (const id of staleChunkIds(existingIds, chunks.map((c) => c.id))) tx.delete(col.doc(id));
}

/** その記録のチャンクを全部消す（トランザクション内。憲法第13条：完全削除） */
export function deleteChunksInTx(tx: Transaction, db: Firestore, uid: string, ids: string[]): void {
  const col = db.collection(chunkCollectionPath(uid));
  for (const id of ids) tx.delete(col.doc(id));
}
