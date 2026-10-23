"use client";

// 設定の呼び名（PLAN 49）。最大12文字・空にすると自動の呼び名に戻る・打つとすぐ保存（PUT /api/profile は merge）。
// 自動の呼び名は表示専用で保存しない（AI の {{profile}} に入れない）。文言はプロトタイプ #nameIn / #nameHint のとおり。

import { useCallback, useEffect, useRef } from "react";
import { Paper } from "@/components/ui/Paper";
import LimitCounter from "@/components/ui/LimitCounter";
import { authedJson, type AppUser } from "@/lib/db/useUser";
import { useLimitedInput } from "@/lib/ui/useLimitedInput";
import { autoNameFor } from "@/lib/logic/autoName";
import { MAX_NICKNAME_LENGTH } from "@/lib/logic/limits";
import { NICKNAME_SAVE_DELAY_MS, nicknameHint, normalizeNickname } from "@/lib/auth/link";
import { showToast } from "@/components/ui/Toast";
import styles from "./settings.module.css";

export default function NameCard({
  user,
  initial,
  onSaved,
}: {
  user: AppUser;
  /** 保存済みの呼び名（未設定は ""） */
  initial: string;
  /** 保存できたら（表示の呼び名を読み直す） */
  onSaved?: (nickname: string) => void;
}) {
  const auto = autoNameFor(user.uid);
  const input = useLimitedInput({ max: MAX_NICKNAME_LENGTH, label: "呼び名は", initial });
  const { value } = input;

  const savedRef = useRef(normalizeNickname(initial));
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const save = useCallback(
    async (nickname: string) => {
      if (nickname === savedRef.current) return;
      try {
        const res = await authedJson(user, "PUT", "/api/profile", { nickname });
        if (!res.ok) throw new Error(`profile ${res.status}`);
        savedRef.current = nickname;
        onSavedRef.current?.(nickname);
      } catch {
        showToast("呼び名を保存できませんでした。もう一度試してね。");
      }
    },
    [user],
  );

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next !== null) void save(next);
  }, [save]);

  // 打ち終わってから保存（入れるとすぐ反映）
  useEffect(() => {
    const next = normalizeNickname(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (next === savedRef.current) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = next;
    timerRef.current = setTimeout(flush, NICKNAME_SAVE_DELAY_MS);
  }, [value, flush]);

  // 画面を離れるときは待たずに保存
  useEffect(() => () => flush(), [flush]);

  return (
    <Paper as="section" className={styles.card} aria-label="呼び名">
      <h3>呼び名</h3>
      <div className={styles.nameWrap}>
        <input
          className={`${styles.nameIn} ${input.shaking ? "shake" : ""}`}
          value={value}
          onChange={input.onChange}
          onBlur={flush}
          placeholder={auto}
          aria-label="呼び名"
          autoComplete="off"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <LimitCounter {...input.counter} className={styles.nameCount} />
      </div>
      <div className={styles.nameHint} aria-live="polite">
        {nicknameHint(value, auto)}
      </div>
    </Paper>
  );
}

export { NameCard };
