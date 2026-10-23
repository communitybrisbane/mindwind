// 記録を消したとき、その記録の写し（相談の「読み返したページ」・手紙の引用）を伏せる純粋ロジック（憲法第13条。Vitest 対象）。
// 相談の refs（{ id, date, title, quote } または旧6項目のスナップショット）と、手紙の refs（{ thoughtId, date, quote }）の両方を扱う。
// 伏せたあとは id と日付だけ残す（本文・題・6項目は消す）。元の配列は変えず、変わらなければ changed: false。

export type ScrubResult<T> = { changed: boolean; refs: T[] };

/** 相談メッセージの refs。1件でも id が一致すれば、その要素を { id, date, deleted: true } に置き換える */
export function scrubChatRefs(refs: unknown, thoughtId: string): ScrubResult<Record<string, unknown>> {
  if (!Array.isArray(refs)) return { changed: false, refs: [] };
  let changed = false;
  const next = refs.map((r) => {
    if (!r || typeof r !== "object") return r as Record<string, unknown>;
    const ref = r as Record<string, unknown>;
    if (ref.id !== thoughtId || ref.deleted === true) return ref;
    changed = true;
    return { id: thoughtId, date: typeof ref.date === "string" ? ref.date : "", deleted: true };
  });
  return { changed, refs: next };
}

/** 手紙の refs。thoughtId が一致すれば quote を空にして deleted: true（手紙は残す。契約 §8） */
export function scrubLetterRefs(refs: unknown, thoughtId: string): ScrubResult<Record<string, unknown>> {
  if (!Array.isArray(refs)) return { changed: false, refs: [] };
  let changed = false;
  const next = refs.map((r) => {
    if (!r || typeof r !== "object") return r as Record<string, unknown>;
    const ref = r as Record<string, unknown>;
    if (ref.thoughtId !== thoughtId || ref.deleted === true) return ref;
    changed = true;
    return { ...ref, quote: "", deleted: true };
  });
  return { changed, refs: next };
}
