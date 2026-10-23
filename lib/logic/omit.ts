/** 指定キー以外を残した浅いコピーを返す（分割代入で未使用変数を作らずに除外するため） */
export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}
