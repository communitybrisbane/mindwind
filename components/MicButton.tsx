"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon } from "./icons";

// Web Speech API は TS の dom 型定義に含まれないため最小限を自前定義。
// 将来サーバー側 STT（Whisper 等）へ差し替える場合はこのコンポーネントごと入れ替える
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

type Props = {
  /** 確定した文字起こし（呼び出し側で既存テキストに追記する） */
  onFinal: (text: string) => void;
  /** 認識途中のテキスト（リアルタイム表示用。確定時は "" が来る） */
  onInterim: (text: string) => void;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
};

/** 音声入力ボタン（32px 丸形）。ブラウザ非対応時は何も描画しない */
export default function MicButton({ onFinal, onInterim, onRecordingChange, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const recordingRef = useRef(false);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      recordingRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  function setRec(value: boolean) {
    recordingRef.current = value;
    setRecording(value);
    onRecordingChange?.(value);
  }

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) onFinal(result[0].transcript);
        else interim += result[0].transcript;
      }
      onInterim(interim);
    };
    // iOS Safari は連続認識が勝手に止まるため、録音中フラグが立つ間は即再開する（実装必須）
    rec.onend = () => {
      if (!recordingRef.current) return;
      try {
        rec.start();
      } catch {
        setRec(false);
      }
    };
    rec.onerror = null;
    recognitionRef.current = rec;
    rec.start();
    setRec(true);
  }

  function stop() {
    setRec(false);
    onInterim("");
    recognitionRef.current?.stop();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      aria-label={recording ? "録音を停止する" : "音声で入力する"}
      aria-pressed={recording}
      disabled={disabled}
      onClick={recording ? stop : start}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-white disabled:bg-ink-tertiary ${
        recording ? "animate-pulse bg-error" : "bg-accent"
      }`}
    >
      <MicIcon className="h-[18px] w-[18px]" />
    </button>
  );
}
