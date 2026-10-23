// embedding の保存形式（サーバー専用）。Firestore のベクトル型で保存すると findNearest（Vector Search）が使える。
// 移行前の記録は number 配列のまま残っているため、読むときは両方を受け付ける
import { FieldValue } from "firebase-admin/firestore";

/** 書き込み用：Firestore のベクトル型にする */
export function toStoredEmbedding(embedding: number[]) {
  return FieldValue.vector(embedding);
}

/** 読み取り用：ベクトル型（toArray を持つ）と旧形式の number 配列のどちらも number[] にする */
export function readEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value)) return value as number[];
  if (value && typeof (value as { toArray?: unknown }).toArray === "function") {
    return (value as { toArray: () => number[] }).toArray();
  }
  return null;
}
