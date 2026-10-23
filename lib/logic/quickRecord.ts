// 一言（kind: "quick"）の保存用の純粋ロジック。サーバー側の検証（クライアント側は lib/logic/quickNote.ts〔64〕）。
// 上限・最短は lib/logic/limits.ts が正（契約 §8）。
import { MAX_QUICK_LENGTH, MIN_QUICK_LENGTH } from "@/lib/logic/limits";
import { isMoodId, moodMetaLine, type MoodId } from "@/lib/logic/moods";

export type QuickTextResult =
  | { ok: true; text: string }
  | { ok: false; error: "too_short" | "too_long" };

/** 文字数（サロゲートペアを1文字と数える。絵文字1つで2文字にならないように） */
export function charLength(text: string): number {
  return Array.from(text).length;
}

/** 一言を trim して最短・上限を確かめる（trim 後 2〜60 文字） */
export function validateQuickText(text: string): QuickTextResult {
  const trimmed = text.trim();
  const len = charLength(trimmed);
  if (len < MIN_QUICK_LENGTH) return { ok: false, error: "too_short" };
  if (len > MAX_QUICK_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, text: trimmed };
}

/** Firestore から読んだ気分の値を MoodId にする（不正・未設定は undefined） */
export function toMood(value: unknown): MoodId | undefined {
  return isMoodId(value) ? value : undefined;
}

/** 一言のチャンクに添える検索用メタ（AI を呼ばない固定の一行。気分が無ければ付けない） */
export function quickMeta(mood: MoodId | undefined): string | undefined {
  return mood === undefined ? undefined : moodMetaLine(mood);
}
