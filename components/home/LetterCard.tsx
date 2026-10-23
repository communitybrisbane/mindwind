"use client";

// 手紙のカード（/letter へ）。GET /api/letters/current の状態で文言と未読の点を変える。
// 取れないとき（API 未実装・通信失敗）は、届いていない扱いの静かな文言にする。

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import Icon from "@/components/ui/Icon";
import type { CurrentLetterResponse } from "@/lib/api/contracts";
import { authedJsonOrNull, useUser } from "@/lib/db/useUser";
import { sound } from "@/lib/ui/feedback";
import styles from "./home.module.css";

type View = { title: string; sub: string; unread: boolean };

function viewOf(res: CurrentLetterResponse | null): View {
  if (!res) return { title: "今週の手紙", sub: "日曜日に、この1週間のあなたの言葉が届くよ", unread: false };
  switch (res.status) {
    case "ready":
      return res.letter?.readAt
        ? { title: "今週の手紙", sub: "この1週間の、あなたの言葉", unread: false }
        : { title: "手紙が届いたよ", sub: "この1週間の、あなたの言葉", unread: true };
    case "none":
      return { title: "手紙が届いたよ", sub: "この1週間の、あなたの言葉", unread: true };
    case "generating":
      return { title: "手紙を書いているよ", sub: "この1週間の、あなたの言葉", unread: false };
    case "locked":
    default:
      return { title: "今週の手紙", sub: "日曜日に、この1週間のあなたの言葉が届くよ", unread: false };
  }
}

export default function LetterCard() {
  const router = useRouter();
  const { user } = useUser();
  const [res, setRes] = useState<CurrentLetterResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authedJsonOrNull(user, "/api/letters/current")
      .then((data: CurrentLetterResponse | null) => {
        if (!cancelled) setRes(data && typeof data.status === "string" ? data : null);
      })
      .catch(() => {
        if (!cancelled) setRes(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const v = viewOf(res);
  const open = () => {
    sound("pop");
    router.push("/letter");
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      className={`sheet ${styles.letter}`}
      role="button"
      tabIndex={0}
      aria-label={v.unread ? "今週の手紙を開く（未読）" : "今週の手紙を開く"}
      onClick={open}
      onKeyDown={onKey}
    >
      <div className={styles.envi}>
        <Icon name="env" />
        {v.unread && <b className={styles.unread} aria-hidden="true" />}
      </div>
      <div className={styles.lt}>
        <b>{v.title}</b>
        <span>{v.sub}</span>
      </div>
      <div className={styles.go} aria-hidden="true">
        <Icon name="arrow" />
      </div>
    </div>
  );
}
