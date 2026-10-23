// prefers-reduced-motion（OS）か、アプリ内「動きをへらす」のどちらかが有効なら true。
// true のとき <html class="rm"> を付ける（付け外しはこのフックを使う側ではなく FeedbackBoot が呼ぶ applyReducedMotionClass）。
import { useEffect, useSyncExternalStore } from "react";
import { usePreferences } from "./preferences";

const QUERY = "(prefers-reduced-motion: reduce)";

/** 純粋な合成ルール */
export function combineReducedMotion(osPrefers: boolean, appSetting: boolean): boolean {
  return osPrefers || appSetting;
}

function subscribeOs(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getOs(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** <html> に rm クラスを付け外しする */
export function applyReducedMotionClass(on: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("rm", on);
}

export function useReducedMotion(): boolean {
  const { reduceMotion } = usePreferences();
  const os = useSyncExternalStore(subscribeOs, getOs, () => false);
  const rm = combineReducedMotion(os, reduceMotion);
  useEffect(() => {
    applyReducedMotionClass(rm);
  }, [rm]);
  return rm;
}
