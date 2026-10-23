"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/** 遷移先で出すトーストの置き場（既存 components/Toast.tsx と同じキー） */
const KEY = "mindwind-toast";
const SHOW_MS = 2200;

type ToastState = { message: string; visible: boolean };

let state: ToastState = { message: "", visible: false };
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const SERVER_STATE: ToastState = { message: "", visible: false };

function emit(next: ToastState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** いま出す（同一画面） */
export function showToast(message: string): void {
  if (!message) return;
  clearTimeout(hideTimer);
  emit({ message, visible: true });
  hideTimer = setTimeout(() => emit({ ...state, visible: false }), SHOW_MS);
}

/** 遷移先で出す（sessionStorage "mindwind-toast"） */
export function requestToast(message: string): void {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // 保存できない環境では、いま出す
    showToast(message);
  }
}

function takeRequested(): string | null {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) sessionStorage.removeItem(KEY);
    return stored;
  } catch {
    return null;
  }
}

/** 机の上の黒い札。ルートに1つだけ置く */
export function ToastHost() {
  const { message, visible } = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  const pathname = usePathname();

  // 画面が変わるたびに、前の画面から頼まれたトーストを出す
  useEffect(() => {
    const stored = takeRequested();
    if (stored) showToast(stored);
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        left: 30,
        right: 30,
        top: 94,
        // 記録のモーダル（46）・ダイアログ（48）の上にも出す
        zIndex: 60,
        pointerEvents: "none",
        padding: "10px 14px",
        borderRadius: 6,
        border: "1px dashed rgba(244,236,216,.3)",
        background: "rgba(10,20,16,.82)",
        color: "var(--color-cream)",
        fontFamily: "var(--font-hand)",
        fontSize: 13,
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(-10px)",
        transition: "opacity .3s, transform .3s",
      }}
    >
      {message}
    </div>
  );
}

export default ToastHost;
