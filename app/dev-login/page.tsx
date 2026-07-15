"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/db/firebase";

/** 開発専用：カスタムトークンでログインして UI 検証するためのページ。本番では何もせず / へ戻す */
export default function DevLoginPage() {
  return (
    <Suspense>
      <DevLogin />
    </Suspense>
  );
}

function DevLogin() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      router.replace("/");
      return;
    }
    const token = params.get("token");
    if (!token) return;
    signInWithCustomToken(auth, token)
      .then(() => router.replace(params.get("to") ?? "/home"))
      .catch(() => router.replace("/"));
  }, [params, router]);

  return <p className="p-6 text-sm text-ink-secondary">dev login...</p>;
}
