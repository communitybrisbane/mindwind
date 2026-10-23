// 端末ごとの設定（音・振動・動きをへらす）。localStorage "mindwind:prefs" に保存し、購読できる。
// SSR では常に既定値を返す（ハイドレーションのずれを避けるため getServerSnapshot も既定値）。
import { useSyncExternalStore } from "react";

export type Preferences = { sound: boolean; vibrate: boolean; reduceMotion: boolean };

export const PREFS_KEY = "mindwind:prefs";

export const DEFAULT_PREFERENCES: Preferences = {
  sound: false,
  vibrate: true,
  reduceMotion: false,
};

/** 保存された文字列を安全に Preferences にする。壊れた値・欠けた項目は既定値で埋める。 */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return DEFAULT_PREFERENCES;
    const o = v as Record<string, unknown>;
    return {
      sound: typeof o.sound === "boolean" ? o.sound : DEFAULT_PREFERENCES.sound,
      vibrate: typeof o.vibrate === "boolean" ? o.vibrate : DEFAULT_PREFERENCES.vibrate,
      reduceMotion:
        typeof o.reduceMotion === "boolean" ? o.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function samePreferences(a: Preferences, b: Preferences): boolean {
  return a.sound === b.sound && a.vibrate === b.vibrate && a.reduceMotion === b.reduceMotion;
}

const listeners = new Set<() => void>();
// useSyncExternalStore は同じ値なら同じ参照を返す必要があるのでキャッシュする
let cache: Preferences = DEFAULT_PREFERENCES;
let loaded = false;

function readStorage(): Preferences {
  try {
    return parsePreferences(window.localStorage.getItem(PREFS_KEY));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function refresh(): boolean {
  const next = readStorage();
  const changed = !samePreferences(next, cache);
  if (changed) cache = next;
  loaded = true;
  return changed;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  if (!loaded) refresh();
  return cache;
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  if (typeof window === "undefined") return;
  const next: Preferences = { ...getPreferences(), [key]: value };
  cache = next;
  loaded = true;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても、このタブの中では反映する
  }
  emit();
}

let storageHooked = false;
function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== PREFS_KEY) return;
  if (refresh()) emit();
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined" && !storageHooked) {
    storageHooked = true;
    window.addEventListener("storage", onStorage); // 別タブの変更
  }
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    subscribePreferences,
    getPreferences,
    () => DEFAULT_PREFERENCES,
  );
}
