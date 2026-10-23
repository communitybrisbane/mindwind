// 記録のタイトル（契約 §4・PLAN 56）。本文の先頭から自動で作る。AI は使わない。
import { MAX_AUTO_TITLE_LENGTH } from "@/lib/logic/limits";

/**
 * 先頭の行を 。！？\n で区切った最初の空でない一文を trim し、20 文字まで（切るときは「…」を付けず 20 文字ちょうど）。
 * 本文を編集して変わればタイトルも作り直す（呼び出し側）。
 */
export function autoTitle(rawText: string): string {
  const first = rawText
    .split(/[。！？\n\r]/)
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  if (!first) return "";
  return Array.from(first).slice(0, MAX_AUTO_TITLE_LENGTH).join("");
}
