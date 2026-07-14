import Link from "next/link";
import { SpiralIcon } from "@/components/icons";

/** スタート画面（Google ログインは Phase 2 で実装） */
export default function StartPage() {
  return (
    <main className="flex flex-1 flex-col justify-between bg-accent px-6 pb-12 pt-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <SpiralIcon className="h-20 w-40 text-white" />
        <h1 className="text-3xl font-semibold text-white">MindWind</h1>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/home"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white bg-white px-6 py-3 text-base font-semibold text-accent active:scale-95"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-white">
            G
          </span>
          Google ではじめる
        </Link>
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
