"use client";

// 下書き（端末内だけ）の hook（契約 §4 タスク68）。サーバーには送らない。
// 保存は 500ms のデバウンス。画面を離れるときは待っている分を書き切る。

import { useCallback, useEffect, useMemo, useState } from "react";
import { createDebouncedSaver, type DraftData } from "@/lib/logic/draft";
import { clearDraft, loadDraft, saveDraft } from "@/lib/ui/draftStore";

export function useDraft(key: string): {
  draft: DraftData | null;
  /** デバウンス 500ms で保存 */
  save(d: DraftData): void;
  /** 待っている保存を捨て、端末の下書きも消す（保存成功のとき） */
  clear(): void;
} {
  const [draft, setDraft] = useState<DraftData | null>(null);

  // localStorage は SSR には無いので、マウント後に読む
  useEffect(() => {
    const timer = setTimeout(() => setDraft(loadDraft(key)), 0);
    return () => clearTimeout(timer);
  }, [key]);

  const saver = useMemo(
    () => createDebouncedSaver<DraftData>((d) => void saveDraft(key, d)),
    [key],
  );
  // キーが変わる・画面を離れるときは、待っている分を書き切る
  useEffect(() => () => saver.flush(), [saver]);

  const save = useCallback((d: DraftData) => saver.call(d), [saver]);
  const clear = useCallback(() => {
    saver.cancel();
    clearDraft(key);
    setDraft(null);
  }, [saver, key]);

  return { draft, save, clear };
}
