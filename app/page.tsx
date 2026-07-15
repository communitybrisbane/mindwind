"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { SpiralIcon } from "@/components/icons";
import { auth, googleProvider } from "@/lib/db/firebase";
import { useUser } from "@/lib/db/useUser";

/** スタート画面（Google ログイン） */
export default function StartPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ログイン済みならホームへ（振り分けの続きは認証ガードが行う）
  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [user, loading, router]);

  async function login() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      // 初回（profile 未設定）の /onboarding への振り分けは認証ガード側で行う
      router.push("/home");
    } catch (e) {
      // ユーザーがポップアップを閉じただけならエラー表示しない
      const code = (e as { code?: string }).code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("ログインできませんでした。少し待ってからもう一度試してください。");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-between bg-accent px-6 pb-12 pt-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <SpiralIcon className="h-20 w-40 text-white" />
        <h1 className="text-3xl font-semibold text-white">MindWind</h1>
      </div>
      <div className="flex flex-col items-center gap-3">
        {error && <p className="text-center text-sm text-white">{error}</p>}
        <button
          type="button"
          onClick={() => void login()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white bg-white px-6 py-3 text-base font-semibold text-accent active:scale-95 disabled:opacity-70"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-white">
            G
          </span>
          {busy ? "ログイン中..." : "Google ではじめる"}
        </button>
        <p className="text-xs text-white/65">
          <Link href="/terms" className="text-white/90 underline">
            利用規約
          </Link>
          ・
          <Link href="/privacy" className="text-white/90 underline">
            プライバシーポリシー
          </Link>
          に同意して続行
        </p>
      </div>
    </main>
  );
}
