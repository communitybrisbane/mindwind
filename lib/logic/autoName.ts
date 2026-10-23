// 自動の呼び名（PLAN 48）。風にちなんだ「ものや生きもの」から uid で決める。
// 風の強さ・向きを表す言葉は使わない。表示専用で、AI の {{profile}} には入れない（憲法第12条）。

export const AUTO_NAMES = [
  "風見",
  "風車",
  "風鈴",
  "渡り鳥",
  "旅人",
  "凧",
  "羽根",
  "帆",
  "風読み",
] as const;

export type AutoName = (typeof AUTO_NAMES)[number];

/** FNV-1a 32bit（UTF-16 のコード単位ごと）。符号なし整数を返す */
export function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** uid から自動の呼び名（「さん」は付けない）。同じ uid は常に同じ名前 */
export function autoNameFor(uid: string): AutoName {
  return AUTO_NAMES[fnv1a32(uid) % AUTO_NAMES.length];
}

/** 表示用の呼び名：(nickname.trim() || 自動の呼び名) + "さん" */
export function displayNameFor(nickname: string | undefined | null, uid: string): string {
  const own = (nickname ?? "").trim();
  return `${own || autoNameFor(uid)}さん`;
}
