"use client";

import styles from "./record.module.css";

type Props = {
  /** メンターの字（AI の深掘りの1問・言い換えのお願い）。本人の文章は渡さない */
  text: string;
  className?: string;
};

/** 余白のメンターの字（緑インク・左に緑の縦線・下からふわっと）。プロトタイプ #recMentor / .mnote */
export default function MentorNote({ text, className }: Props) {
  if (!text) return null;
  return (
    <p className={["mnote", styles.mentor, className ?? ""].filter(Boolean).join(" ")} aria-live="polite">
      {text}
    </p>
  );
}

export { MentorNote };
