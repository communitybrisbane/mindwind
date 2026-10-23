// 下書きの localStorage ラッパー（薄い層）。localStorage が使えなくても例外を出さない。
// サーバーには送らない。純粋ロジックは lib/logic/draft.ts。
import { type DraftData, isDraftEmpty, parseDraft, serializeDraft } from "@/lib/logic/draft";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadDraft(key: string): DraftData | null {
  try {
    return parseDraft(storage()?.getItem(key));
  } catch {
    return null;
  }
}

/** 空の下書きは保存せず、残っていれば消す。成功したら true。 */
export function saveDraft(key: string, d: DraftData): boolean {
  if (isDraftEmpty(d)) {
    clearDraft(key);
    return false;
  }
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(key, serializeDraft(d));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // 使えない環境では何もしない
  }
}
