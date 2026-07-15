// 記録チャットのメッセージ型と、recordChat（Firestore）保存形式との相互変換

import type { ShapedRecord } from "@/lib/db/types";

export type RecordMessage =
  | { role: "user" | "ai"; kind: "text"; text: string }
  | { role: "ai"; kind: "card"; shaped: ShapedRecord; thoughtId: string };

/** recordChat（Firestore）の保存形式 */
export type StoredMessage = {
  role: "user" | "ai";
  type: "text" | "card";
  content: string;
  thoughtId?: string;
};

export function toStored(messages: RecordMessage[]): StoredMessage[] {
  return messages.map((m) =>
    m.kind === "card"
      ? { role: "ai", type: "card", content: JSON.stringify(m.shaped), thoughtId: m.thoughtId }
      : { role: m.role, type: "text", content: m.text }
  );
}

export function fromStored(stored: StoredMessage[]): RecordMessage[] {
  return stored.flatMap((m): RecordMessage[] => {
    if (m.type === "card") {
      try {
        return [
          { role: "ai", kind: "card", shaped: JSON.parse(m.content), thoughtId: m.thoughtId ?? "" },
        ];
      } catch {
        return []; // 壊れたカードは黙って捨てる（復元全体を失敗させない）
      }
    }
    return [{ role: m.role, kind: "text", text: m.content }];
  });
}

/** 保存済みカードだけを取り出す（チップ表示・上限判定に使う） */
export function savedCards(messages: RecordMessage[]) {
  return messages.filter((m) => m.kind === "card");
}

/** 最後のカードより後ろ＝進行中セッションのメッセージ */
export function currentSession(messages: RecordMessage[]): RecordMessage[] {
  let lastCardIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].kind === "card") {
      lastCardIndex = i;
      break;
    }
  }
  return messages.slice(lastCardIndex + 1);
}
