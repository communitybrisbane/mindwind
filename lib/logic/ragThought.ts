// 相談の RAG が AI と画面に渡す「参考記録」1件の形（純粋ロジック。Vitest 対象）。
// quote は本人の言葉そのまま（検索で当たったチャンクの text を order 順につないだもの）。
// 旧データ（移行前・6項目だけで本文が無い記録）は、残っている6項目を quote に入れて読めるようにする。
import { SHAPED_FIELDS } from "@/lib/db/types";
import { autoTitle } from "@/lib/logic/title";

export type RagThought = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** 本文の先頭から作る短い題（画面の付箋用。AI には渡さない） */
  title: string;
  /** AI に渡し、画面にも出す本人の言葉 */
  quote: string;
  /** 最も高かった類似度（0〜1）。旧検索のフォールバックでは省略 */
  similarity?: number;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * 旧 thoughts（embedding をドキュメントに持つ移行前の記録）を参考記録にする。
 * rawText があればそれを本人の言葉として使い、無ければ旧6項目を「項目名：内容」で並べる（AI の成形文であることは変わらないが、
 * 移行前の記録を相談で参照できなくするよりはよい。移行が済めばこの経路は使われない）。
 */
export function legacyToRagThought(id: string, data: Record<string, unknown>): RagThought {
  const rawText = str(data.rawText);
  const answer = str(data.deepDiveAnswer);
  const question = str(data.deepDiveQuestion);
  let quote: string;
  if (rawText) {
    quote = answer ? `${rawText}\n${question ? `Q: ${question}\nA: ${answer}` : `A: ${answer}`}` : rawText;
  } else {
    quote = SHAPED_FIELDS.map(({ key, label }) => {
      const value = str(data[key]);
      return value ? `${label.replace("（AIの気づき）", "")}：${value}` : "";
    })
      .filter(Boolean)
      .join("\n");
  }
  return {
    id,
    date: str(data.date),
    title: str(data.title) || autoTitle(rawText || quote),
    quote,
  };
}
