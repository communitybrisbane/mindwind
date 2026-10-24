"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { LimitCounter } from "@/components/ui/LimitCounter";
import { showToast } from "@/components/ui/Toast";
import { MAX_CONSULT_MESSAGE } from "@/lib/logic/limits";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useLimitedInput } from "@/lib/ui/useLimitedInput";
import { getRecognitionCtor, type Recognition } from "@/lib/ui/speechRecognition";
import styles from "./consult.module.css";

/** 1行の高さ（px）と、中でスクロールに切り替わる高さ（5行） */
const LINE_PX = 30;
const MAX_PX = LINE_PX * 5;

type Props = {
  /** 最初に入れておく下書き（/search?draft=） */
  initial?: string;
  /** 入力そのものを閉じる（1日の上限など） */
  disabled?: boolean;
  /** 返事を待っている間（書けるが送れない） */
  busy?: boolean;
  placeholder?: string;
  /** 送る。false を返したら（上限など）書いた文を入力欄に戻す */
  onSend: (text: string) => Promise<boolean> | boolean;
  /** 入力欄の高さが変わった（会話エリアを下まで追従させる） */
  onResize?: () => void;
};

/** 相談の入力欄。行が増えると上へ大きくなり（1〜5行、超えたら中でスクロール）、
 *  右下の1ボタンが 空＝マイク／文字あり＝紙飛行機 にくるっと入れ替わる。Enter で送信・Shift+Enter で改行 */
export default function ConsultInput({
  initial = "",
  disabled = false,
  busy = false,
  placeholder = "いま思っていること",
  onSend,
  onResize,
}: Props) {
  const { value, setValue, onChange, shaking, counter } = useLimitedInput({
    max: MAX_CONSULT_MESSAGE,
    label: "相談は",
    initial,
  });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const recordingRef = useRef(false);
  const valueRef = useRef(value);
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    valueRef.current = value;
    onResizeRef.current = onResize;
  });

  const has = value.trim().length > 0;

  // 行数に合わせて高さを変える（1〜5行）
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = `${LINE_PX}px`;
    const h = Math.min(MAX_PX, Math.max(LINE_PX, ta.scrollHeight));
    ta.style.height = `${h}px`;
    ta.style.overflowY = ta.scrollHeight > MAX_PX ? "auto" : "hidden";
  }, [value]);

  // 入力欄の高さが変わったら、会話エリアの下の余白を追従させる
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => onResizeRef.current?.());
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // 外れたら録音を止める
  useEffect(
    () => () => {
      recordingRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  function stopRecording() {
    recordingRef.current = false;
    setRecording(false);
    recRef.current?.stop();
  }

  function startRecording() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      showToast("このブラウザでは音声で書けません");
      return;
    }
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = false;
    let fatal = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) text += r[0].transcript;
      }
      if (!text) return;
      const next = valueRef.current + text;
      if (next.length > MAX_CONSULT_MESSAGE) {
        showToast(`相談は${MAX_CONSULT_MESSAGE}文字までだよ`);
      }
      setValue(next);
    };
    rec.onerror = (e) => {
      const code = e?.error ?? "";
      if (code === "no-speech" || code === "aborted") return;
      fatal = true;
    };
    // iOS Safari は連続認識が勝手に止まるので、録音中のあいだは再開する
    rec.onend = () => {
      if (fatal) {
        recordingRef.current = false;
        setRecording(false);
        showToast("マイクが使えませんでした");
        return;
      }
      if (!recordingRef.current) return;
      try {
        rec.start();
      } catch {
        recordingRef.current = false;
        setRecording(false);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      recordingRef.current = true;
      setRecording(true);
    } catch {
      showToast("マイクが使えませんでした");
    }
  }

  async function submit() {
    const text = value.trim();
    if (!text || disabled || busy) return;
    if (recordingRef.current) stopRecording();
    vibrate(12);
    sound("pop");
    setValue("");
    const ok = await onSend(text);
    if (ok === false) setValue(text);
  }

  function onButton() {
    if (value.trim()) {
      void submit();
      return;
    }
    vibrate(10);
    sound("pop");
    if (recording) stopRecording();
    else startRecording();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const barCls = [styles.cvBar, has ? styles.has : "", recording && !has ? styles.recording : "", shaking ? "shake" : ""]
    .filter(Boolean)
    .join(" ");

  const buttonLabel = has ? "送る" : recording ? "録音を止める" : "音声で書く";

  return (
    <div ref={barRef}>
      <Paper className={barCls}>
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={recording ? "聞いています…" : placeholder}
          aria-label="相談を書く"
          disabled={disabled}
          enterKeyHint="send"
        />
        <span className={styles.counter}>
          <LimitCounter {...counter} />
        </span>
        <button
          type="button"
          className={styles.send}
          aria-label={buttonLabel}
          aria-pressed={!has ? recording : undefined}
          disabled={disabled || (has && busy)}
          onClick={onButton}
        >
          <span className={`${styles.sendIcon} ${styles.mic}`} aria-hidden="true">
            <Icon name="mic" />
          </span>
          <span className={`${styles.sendIcon} ${styles.plane}`} aria-hidden="true">
            <Icon name="plane" />
          </span>
        </button>
      </Paper>
    </div>
  );
}
