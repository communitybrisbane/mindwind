import { SpiralIcon } from "./icons";

type Props = {
  /** record=日記帳トーン（warm＋枠線）／consult=会話トーン（白カード＋影） */
  tone: "record" | "consult";
};

/** AI が考え中のバブル（3点バウンス）。送信直後にチャットの流れの中に出す */
export default function ThinkingBubble({ tone }: Props) {
  return (
    <div className="flex max-w-[92%] items-start gap-2">
      <span
        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
          tone === "record" ? "bg-primary" : "bg-accent"
        }`}
      >
        <SpiralIcon className="h-3 w-5 text-white" />
      </span>
      <div
        className={`flex items-center gap-1 rounded-xl rounded-tl-[4px] px-4 py-4 ${
          tone === "record" ? "border border-ceramic bg-warm" : "bg-white shadow-card"
        }`}
      >
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-tertiary"
            style={{ animationDelay: `${n * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
