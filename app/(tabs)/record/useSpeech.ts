"use client";

import { useRecognition } from "@/lib/ui/useRecognition";

/** 音声入力（既存 MicButton と同じ挙動：iOS で止まったら再開・許可拒否などは onError） */
export function useSpeech(handlers: {
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: () => void;
}) {
  const { supported, recording, start, stop } = useRecognition({
    interimResults: true,
    ignoreStartWhileRecording: true,
    sharedFatalFlag: true,
    onResult: ({ finals, interim }) => {
      for (const text of finals) handlers.onFinal(text);
      handlers.onInterim(interim);
    },
    onReset: () => handlers.onInterim(""),
    onError: () => handlers.onError(),
  });
  return { supported, recording, start, stop };
}
