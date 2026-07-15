"use client";

import { SpiralIcon } from "@/components/icons";

/** 予期しないエラーの画面（コンポーネントのクラッシュ時に App Router が表示する） */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <SpiralIcon className="h-8 w-16 text-ink-tertiary" />
      <h1 className="mt-6 text-lg font-semibold text-ink">エラーが起きました</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
        少し待ってからもう一度試してください。
        <br />
        何度も続く場合はリロードしてみてください。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 h-11 rounded-xl bg-primary px-8 text-sm font-semibold text-white active:scale-95"
      >
        もう一度試す
      </button>
    </main>
  );
}
