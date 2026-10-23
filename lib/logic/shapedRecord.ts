import type { ShapedRecord } from "@/lib/db/types";
import { MAX_SHAPED_FIELD, MAX_TITLE_LENGTH } from "./limits";

export const SHAPED_KEYS = [
  "title",
  "event",
  "thinking",
  "action",
  "reason",
  "emotion",
  "values",
] as const;

/** クライアントから届いた成形済み記録を検証する。7項目すべてが空でない文字列かつ上限以内なら
 *  その7項目だけを取り出して返し、不正なら null */
export function parseShapedRecord(input: unknown): ShapedRecord | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const record: Record<string, string> = {};
  for (const key of SHAPED_KEYS) {
    const value = source[key];
    if (typeof value !== "string" || !value.trim()) return null;
    if (value.length > (key === "title" ? MAX_TITLE_LENGTH : MAX_SHAPED_FIELD)) return null;
    record[key] = value;
  }
  return record as unknown as ShapedRecord;
}
