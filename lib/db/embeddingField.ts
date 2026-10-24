// embedding の読み取り（サーバー専用）。書くときは FieldValue.vector（Vector Search の findNearest 用）。
// 移行前の記録は number 配列のまま残っているため、読むときは両方を受け付ける

/** 読み取り用：ベクトル型（toArray を持つ）と旧形式の number 配列のどちらも number[] にする */
export function readEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value)) return value as number[];
  if (value && typeof (value as { toArray?: unknown }).toArray === "function") {
    return (value as { toArray: () => number[] }).toArray();
  }
  return null;
}
