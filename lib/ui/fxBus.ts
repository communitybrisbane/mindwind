// 風の強さの雰囲気を流す箱（契約 §4）。44 が箱を作り、63（回転盤）が流し、84（components/fx/AmbienceLayer）が受ける。
// React に依存しない。SSR でも落ちない。

import type { MoodId } from "@/lib/logic/moods";

export type FxEvent =
  | { type: "preview"; mood: MoodId }
  | { type: "burst"; mood: MoodId }
  | { type: "spin" }
  | { type: "clear" };

type Listener = (e: FxEvent) => void;

const listeners = new Set<Listener>();

function emit(e: FxEvent): void {
  listeners.forEach((l) => {
    try {
      l(e);
    } catch {
      // 受け手の失敗で送り手を止めない
    }
  });
}

export const fxBus = {
  /** 回転盤が止まった：うっすら */
  preview(mood: MoodId): void {
    emit({ type: "preview", mood });
  },
  /** 決めた：グワッ（嵐は約3秒で弱まる） */
  burst(mood: MoodId): void {
    emit({ type: "burst", mood });
  },
  /** 回している間：静まる */
  spin(): void {
    emit({ type: "spin" });
  },
  /** 消す */
  clear(): void {
    emit({ type: "clear" });
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
