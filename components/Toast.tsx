"use client";

import { useEffect, useState } from "react";

const KEY = "mindwind-toast";

/** 画面遷移をまたいでトーストを出す（遷移前に requestToast → 遷移先で <Toast /> が表示） */
export function requestToast(message: string) {
  sessionStorage.setItem(KEY, message);
}

export default function Toast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY);
    if (!stored) return;
    sessionStorage.removeItem(KEY);
    const show = setTimeout(() => setMessage(stored), 0);
    const hide = setTimeout(() => setMessage(""), 2200);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="absolute left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-leaf px-4 py-2 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 12l6 6L20 6" />
      </svg>
      <span className="text-sm font-medium text-primary">{message}</span>
    </div>
  );
}
