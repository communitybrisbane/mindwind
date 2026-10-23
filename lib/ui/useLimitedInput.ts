"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { warnAtFor } from "@/lib/logic/limits";
import { showToast } from "@/components/ui/Toast";
import { vibrate } from "@/lib/ui/feedback";

const SHAKE_MS = 320;

/** 上限つきの入力。max を超える入力は切り、揺らしてトースト「{label}{max}文字までだよ」 */
export function useLimitedInput(opts: {
  max: number;
  label: string;
  initial?: string;
  onLimit?: () => void;
}) {
  const { max, label, initial = "", onLimit } = opts;
  const [value, setRaw] = useState(initial.slice(0, max));
  const [shaking, setShaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLimitRef = useRef(onLimit);
  useEffect(() => {
    onLimitRef.current = onLimit;
  }, [onLimit]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const hitLimit = useCallback(() => {
    showToast(`${label}${max}文字までだよ`);
    vibrate(25);
    onLimitRef.current?.();
    if (timer.current) clearTimeout(timer.current);
    setShaking(true);
    timer.current = setTimeout(() => setShaking(false), SHAKE_MS);
  }, [label, max]);

  const setValue = useCallback(
    (v: string) => {
      setRaw(v.length > max ? v.slice(0, max) : v);
    },
    [max],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const next = e.target.value;
      if (next.length > max) {
        setRaw(next.slice(0, max));
        hitLimit();
      } else {
        setRaw(next);
      }
    },
    [max, hitLimit],
  );

  return {
    value,
    setValue,
    onChange,
    shaking,
    counter: { length: value.length, max, warnAt: warnAtFor(max) },
  };
}
