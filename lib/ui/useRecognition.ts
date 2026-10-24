"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getRecognitionCtor,
  isFatalRecognitionError,
  parseRecognitionResults,
  type Recognition,
} from "@/lib/ui/speechRecognition";

export type RecognitionOptions = {
  /** 途中経過（interimResults）も受け取るか */
  interimResults: boolean;
  /** 結果が来た。finals＝確定した文（順番どおり）、interim＝途中の文字 */
  onResult: (r: { finals: string[]; interim: string }) => void;
  /** 致命的に終わった・開始に失敗した */
  onError: () => void;
  /** 非対応のブラウザで start が呼ばれた。省略すると何も出さずに戻る */
  onUnsupported?: () => void;
  /** 止めたとき・致命的に終わったときの、録音フラグを下ろした直後に呼ぶ */
  onReset?: () => void;
  /** true なら、録音中の start は何もしない */
  ignoreStartWhileRecording?: boolean;
};

/** 音声認識の本体（記録 useSpeech と相談 ConsultInput の共通部）。
 *  iOS で連続認識が止まったら録音中のあいだは再開する。呼び出し側の違いは options で渡す */
export function useRecognition(options: RecognitionOptions) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognitionCtor(),
    () => false,
  );
  const [recording, setRecording] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const recordingRef = useRef(false);
  const fatalRef = useRef(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const setRec = useCallback((v: boolean) => {
    recordingRef.current = v;
    setRecording(v);
  }, []);

  const stop = useCallback(() => {
    setRec(false);
    optionsRef.current.onReset?.();
    recRef.current?.stop();
  }, [setRec]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      optionsRef.current.onUnsupported?.();
      return;
    }
    if (optionsRef.current.ignoreStartWhileRecording && recordingRef.current) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = optionsRef.current.interimResults;
    rec.onresult = (e) => {
      optionsRef.current.onResult(parseRecognitionResults(e));
    };
    rec.onerror = (e) => {
      if (isFatalRecognitionError(e?.error)) fatalRef.current = true;
    };
    rec.onend = () => {
      if (fatalRef.current) {
        fatalRef.current = false;
        setRec(false);
        optionsRef.current.onReset?.();
        optionsRef.current.onError();
        return;
      }
      if (!recordingRef.current) return;
      try {
        rec.start();
      } catch {
        setRec(false);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setRec(true);
    } catch {
      optionsRef.current.onError();
    }
  }, [setRec]);

  useEffect(
    () => () => {
      recordingRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  /** いま録音中か（state ではなく ref。送信の直前などに最新を見る） */
  const isRecording = useCallback(() => recordingRef.current, []);

  return { supported, recording, start, stop, isRecording };
}
