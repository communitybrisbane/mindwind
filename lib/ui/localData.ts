// 端末に残る本人の値（下書き・再会カードの印・回転盤の印など）をまとめて消す（アカウント削除・ログアウト・ログインし直し）。
// localStorage が使えない環境では何もしない。純粋な判定は lib/logic/localKeys.ts。
import { isPersonalLocalKey, isPersonalSessionKey, selectKeysToClear } from "@/lib/logic/localKeys";

function keysOf(storage: Storage): (string | null)[] {
  const keys: (string | null)[] = [];
  for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
  return keys;
}

function clearFrom(storage: Storage | null, isPersonal: (k: string) => boolean): number {
  if (!storage) return 0;
  const keys = selectKeysToClear(keysOf(storage), isPersonal);
  for (const k of keys) storage.removeItem(k);
  return keys.length;
}

/** 本人に関わる端末内の値を消す。消した件数を返す（失敗しても例外を出さない） */
export function clearPersonalLocalData(): number {
  if (typeof window === "undefined") return 0;
  let n = 0;
  try {
    n += clearFrom(window.localStorage, isPersonalLocalKey);
  } catch {
    // プライベートモードなどで触れないときは諦める
  }
  try {
    n += clearFrom(window.sessionStorage, isPersonalSessionKey);
  } catch {
    // 同上
  }
  return n;
}
