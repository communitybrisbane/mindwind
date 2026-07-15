// 生成途中の JSON テキストから成形項目を取り出す（成形ストリーミングのプレビュー用）。
// 最終値はサーバーが完全な JSON をパースして送るので、ここは表示専用の best-effort でよい

import type { ShapedRecord } from "@/lib/db/types";

const KEYS: (keyof ShapedRecord)[] = [
  "title",
  "event",
  "thinking",
  "action",
  "reason",
  "emotion",
  "values",
];

/** 書きかけの JSON 文字列値をアンエスケープする（末尾の途中エスケープは捨てる） */
function unescapePartial(raw: string): string {
  let s = raw;
  // 末尾が奇数個のバックスラッシュ＝エスケープの書きかけ → 削る
  const trailing = s.match(/\\+$/);
  if (trailing && trailing[0].length % 2 === 1) s = s.slice(0, -1);
  // 書きかけの \uXXXX も削る
  s = s.replace(/\\u[0-9a-fA-F]{0,3}$/, "");
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

/**
 * 部分 JSON から現時点で読める項目を返す。
 * 値の途中でも「そこまでの文字」を返すので、タイプライター風の表示になる。
 */
export function parsePartialShaped(jsonText: string): Partial<ShapedRecord> {
  const result: Partial<ShapedRecord> = {};
  for (const key of KEYS) {
    const m = jsonText.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
    if (m) result[key] = unescapePartial(m[1]);
  }
  return result;
}
