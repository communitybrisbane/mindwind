/** メンターの書き込み（緑インクの余白メモ）。チャットバブルの代わり */
export default function MentorNote({
  text,
  sig,
  onSkip,
}: {
  text: string;
  sig?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="relative pl-[26px]">
      <span
        aria-hidden
        className="absolute left-0 top-[8px] h-[18px] w-[18px] rounded-[50%_50%_50%_4px] border-[1.6px] border-accent opacity-85"
      />
      <p className="font-serif text-[14.5px] leading-[34px] text-accent">
        <em className="not-italic border-b border-accent/45 pb-px">{text}</em>
      </p>
      {(sig || onSkip) && (
        <p className="text-[11px] leading-[34px] tracking-[0.12em] text-ink-tertiary">
          {sig}
          {onSkip && (
            <>
              {" ・ "}
              <button type="button" onClick={onSkip} className="underline">
                スキップできます
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
