"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getRecognitionCtor, type Recognition } from "@/lib/ui/speechRecognition";

/** 音声入力（既存 MicButton と同じ挙動：iOS で止まったら再開・許可拒否などは onError） */
export function useSpeech(handlers: {
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: () => void;
}) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognitionCtor(),
    () => false,
  );
  const [recording, setRecording] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const recordingRef = useRef(false);
  const fatalRef = useRef(false);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const setRec = useCallback((v: boolean) => {
    recordingRef.current = v;
    setRecording(v);
  }, []);

  const stop = useCallback(() => {
    setRec(false);
    handlersRef.current.onInterim("");
    recRef.current?.stop();
  }, [setRec]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recordingRef.current) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) handlersRef.current.onFinal(r[0].transcript);
        else interim += r[0].transcript;
      }
      handlersRef.current.onInterim(interim);
    };
    rec.onerror = (e) => {
      const code = e?.error ?? "";
      if (code === "no-speech" || code === "aborted") return;
      fatalRef.current = true;
    };
    rec.onend = () => {
      if (fatalRef.current) {
        fatalRef.current = false;
        setRec(false);
        handlersRef.current.onInterim("");
        handlersRef.current.onError();
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
      handlersRef.current.onError();
    }
  }, [setRec]);

  useEffect(
    () => () => {
      recordingRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  return { supported, recording, start, stop };
}
