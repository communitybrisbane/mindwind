"use client";

import { Tape } from "@/components/ui/Tape";
import styles from "./consult.module.css";

/** あなたの問い（マスキングテープで留めた付箋）。本文は書いたまま表示する */
export default function AskSlip({ text }: { text: string }) {
  return (
    <div className={styles.uq}>
      <Tape color="pink" className={styles.uqTape} />
      <span className={styles.who}>あなた</span>
      {text}
    </div>
  );
}
