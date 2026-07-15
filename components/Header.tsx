import { SpiralIcon } from "./icons";

/** 上部ヘッダー（48px・ホームとオンボーディングのみ表示） */
export default function Header() {
  return (
    // backdrop-blur は iOS のスクロール中に重くカクつきの原因になるため、ほぼ同じ見た目の半透明白にする
    <header className="z-10 flex h-12 flex-none items-center justify-center gap-2 border-b border-black/5 bg-white/95">
      <SpiralIcon className="h-4 w-7 text-accent" />
      <span className="text-base font-semibold text-accent">MindWind</span>
    </header>
  );
}
