"use client";

import { useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

/** 内容に応じて高さが伸びる textarea（1行から・スクロールなし） */
export default function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}
