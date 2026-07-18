"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  onerror: ((e: { error?: string }) => void) | null;
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
  /** マイクが使えず録音を停止したとき（許可拒否・認識サービスエラー。呼び出し側で案内を出す） */
  onError?: () => void;
  disabled?: boolean;
  /** 記録ページの文具トレー用の大きめサイズ（44px。既定は 32px） */
  large?: boolean;
};

/** 音声入力ボタン（32px 丸形）。ブラウザ非対応時は何も描画しない */
export default function MicButton({ onFinal, onInterim, onRecordingChange, onError, disabled, large }: Props) {
  // SSR では false、クライアントで対応可否を判定（非対応ならボタン自体を出さない）
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognitionCtor(),
    () => false
  );
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const recordingRef = useRef(false);
  // 致命的エラー（許可拒否など）の目印。onerror → onend の順で発火するため onend 側で拾う
  const fatalErrorRef = useRef(false);

  useEffect(
    () => () => {
      recordingRef.current = false;
      recognitionRef.current?.stop();
    },
    []
  );

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
    // 無害なエラー（無音・中断）は自動再開に任せ、それ以外（not-allowed / audio-capture /
    // network 等）は録音を止めてユーザーに知らせる（無言で失敗させない）
    rec.onerror = (e) => {
      const code = e?.error ?? "";
      if (code === "no-speech" || code === "aborted") return;
      fatalErrorRef.current = true;
    };
    // iOS Safari は連続認識が勝手に止まるため、録音中フラグが立つ間は即再開する（実装必須）
    rec.onend = () => {
      if (fatalErrorRef.current) {
        fatalErrorRef.current = false;
        setRec(false);
        onInterim("");
        onError?.();
        return;
      }
      if (!recordingRef.current) return;
      try {
        rec.start();
      } catch {
        setRec(false);
      }
    };
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
      className={`flex items-center justify-center rounded-full text-white disabled:bg-ink-tertiary ${
        large ? "h-11 w-11" : "h-8 w-8"
      } ${recording ? "animate-mic-pulse bg-error" : "bg-accent"}`}
    >
      <MicIcon className={large ? "h-5 w-5" : "h-[18px] w-[18px]"} />
    </button>
  );
}
