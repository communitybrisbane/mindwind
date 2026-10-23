"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Message, RefPage } from "@/app/(tabs)/search/useConsultChat";
import { Icon } from "@/components/ui/Icon";
import AskSlip from "./AskSlip";
import ReplyLetter from "./ReplyLetter";
import RefSlips from "./RefSlips";
import styles from "./consult.module.css";

type Props = {
  messages: Message[];
  /** 送ってから返事を書き始めるまで */
  thinking: boolean;
  onSelectRef: (ref: RefPage) => void;
  /** 入力欄の高さが変わったときなどに、親が一番下までスクロールさせるための参照 */
  scrollRef?: RefObject<HTMLDivElement | null>;
};

/** 文通の会話エリア：問い（付箋）→ 返事（便箋）→ 読み返したページ、の繰り返し */
export default function ConsultThread({ messages, thinking, onSelectRef, scrollRef }: Props) {
  const ownRef = useRef<HTMLDivElement | null>(null);
  const areaRef = scrollRef ?? ownRef;

  // 新しい問い・書かれていく返事に合わせて、いちばん下を見せる
  useEffect(() => {
    const el = areaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, areaRef]);

  return (
    <div ref={areaRef} className={styles.area}>
      {messages.length === 0 && !thinking ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="swirl" />
          </span>
          <p className={styles.emptyTitle}>過去の自分に相談しよう</p>
          <p className={styles.emptyText}>
            あなたの記録をもとに、
            <br />
            過去のあなたが一緒に考えます
          </p>
        </div>
      ) : (
        <>
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <AskSlip key={i} text={msg.text} />
            ) : (
              <div key={i}>
                <ReplyLetter text={msg.text} streaming={msg.streaming} />
                {msg.refs && !msg.streaming && <RefSlips refs={msg.refs} onSelect={onSelectRef} />}
              </div>
            ),
          )}
          {thinking && <ReplyLetter text="" thinking />}
        </>
      )}
    </div>
  );
}
