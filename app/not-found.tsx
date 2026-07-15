import Link from "next/link";
import { SpiralIcon } from "@/components/icons";

/** 404 ページ */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <SpiralIcon className="h-8 w-16 text-ink-tertiary" />
      <h1 className="mt-6 text-lg font-semibold text-ink">ページが見つかりません</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
        URL が間違っているか、ページが移動した可能性があります。
      </p>
      <Link
        href="/home"
        className="mt-8 flex h-11 items-center rounded-xl bg-primary px-8 text-sm font-semibold text-white active:scale-95"
      >
        ホームへ戻る
      </Link>
    </main>
  );
}
