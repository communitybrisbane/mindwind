"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "./icons";

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
    <div className="absolute left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-leaf px-4 py-2 shadow-card">
      <CheckIcon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-primary">{message}</span>
    </div>
  );
}
