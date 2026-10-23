// 端末（ブラウザ）に残る「本人に関わる値」のキーの見分け（純粋ロジック。Vitest 対象）。
// アカウント削除・ログアウトのとき、下書き（日記の本文）など本人のデータを端末からも消すために使う。
// 音・振動・動きをへらす（"mindwind:prefs"）は端末の好みなので残す。

export const LOCAL_KEY_PREFIX = "mindwind:";

/** 消さないキー（端末の好み） */
export const KEPT_LOCAL_KEYS: readonly string[] = ["mindwind:prefs"];

/** sessionStorage 側のキー（遷移先に渡す合図。本人の文章は入らないが、人が替わるので消す） */
export const SESSION_KEY_PREFIXES: readonly string[] = ["mindwind:", "mindwind-"];

/** localStorage のこのキーを、アカウント削除・ログアウトで消すか */
export function isPersonalLocalKey(key: string): boolean {
  if (!key.startsWith(LOCAL_KEY_PREFIX)) return false;
  return !KEPT_LOCAL_KEYS.includes(key);
}

export function isPersonalSessionKey(key: string): boolean {
  return SESSION_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/** 消す対象のキーを選ぶ（Storage の key(i) を並べたものを渡す） */
export function selectKeysToClear(keys: readonly (string | null)[], isPersonal: (k: string) => boolean): string[] {
  return keys.filter((k): k is string => typeof k === "string" && isPersonal(k));
}
