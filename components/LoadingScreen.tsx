import { SpiralIcon } from "./icons";

/** 画面全体のローディング（スパイラルの点滅）。遷移中・認証チェック中に使う */
export default function LoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <SpiralIcon className="h-8 w-16 animate-pulse text-accent" />
    </div>
  );
}
