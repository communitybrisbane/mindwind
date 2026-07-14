import { SpiralIcon } from "./icons";

/** 上部ヘッダー（48px・ホームとオンボーディングのみ表示） */
export default function Header() {
  return (
    <header className="z-10 flex h-12 flex-none items-center justify-center gap-2 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <SpiralIcon className="h-4 w-7 text-accent" />
      <span className="text-base font-semibold text-accent">MindWind</span>
    </header>
  );
}
