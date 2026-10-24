"use client";

// 設定（PLAN 49・50）。ホーム右上の歯車から。もどる → /home、ログアウト・削除 → /。
// アカウント・呼び名・くらし（音／振動／動きをへらす）・そのほか（利用規約・プライバシー・ログアウト・アカウント削除）。
// 見た目と文言はプロトタイプ docs/prototype/ui-v5.html の #s-settings のとおり。

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { Desk } from "@/components/ui/Desk";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/components/ui/Toast";
import AccountCard, { GoogleSheet, useAccount } from "@/components/settings/AccountCard";
import NameCard from "@/components/settings/NameCard";
import ToggleRows from "@/components/settings/ToggleRows";
import ConfirmDialog from "@/components/settings/ConfirmDialog";
import { authedJson, useUser, type AppUser } from "@/lib/db/useUser";
import { useProfile } from "@/lib/ui/useDisplayName";
import { markSettingsSeen } from "@/lib/ui/useSettingsSeen";
import { sound, vibrate } from "@/lib/ui/feedback";
import styles from "@/components/settings/settings.module.css";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsGate />
    </AuthGuard>
  );
}

function SettingsGate() {
  const { user } = useUser();
  if (!user) return null;
  // ユーザーが替わったら（ログインし直し）中身を作り直す
  return <Settings key={user.uid} user={user} />;
}

function Settings({ user }: { user: AppUser }) {
  const router = useRouter();
  const account = useAccount(user);
  const { profile, loading, reload } = useProfile();
  const [hideStreak, setHideStreak] = useState<boolean | null>(null);

  // 直接開いても（記録・相談のリンクから来ても）歯車の赤い点を消す
  useEffect(() => {
    markSettingsSeen();
  }, []);

  const streakHidden = hideStreak ?? profile?.hideStreak === true;

  const onHideStreak = useCallback(
    async (value: boolean) => {
      setHideStreak(value);
      try {
        const res = await authedJson(user, "PUT", "/api/profile", { hideStreak: value });
        if (!res.ok) throw new Error(`profile ${res.status}`);
      } catch {
        setHideStreak(!value);
        showToast("保存できませんでした。もう一度試してね。");
      }
    },
    [user],
  );

  const go = (href: string) => {
    vibrate(8);
    sound("tick");
    router.push(href);
  };

  return (
    <Desk className={styles.screen}>
      <div className={styles.top}>
        <div className={styles.sm}>アカウントと設定</div>
        <h1 className={styles.title}>設定</h1>
      </div>

      <div className={styles.area}>
        <AccountCard account={account} />

        {loading ? (
          <Paper as="section" className={styles.card} aria-label="呼び名">
            <h3>呼び名</h3>
            <div className={styles.nameHint}>…</div>
          </Paper>
        ) : (
          <NameCard user={user} initial={profile?.nickname ?? ""} onSaved={reload} />
        )}

        <ToggleRows
          hideStreak={loading ? undefined : streakHidden}
          onHideStreak={(v) => void onHideStreak(v)}
        />

        <Paper as="section" className={styles.card} aria-label="そのほか">
          <h3>そのほか</h3>
          <button type="button" className={styles.lrow} onClick={() => go("/terms")}>
            <Icon name="book" />
            利用規約
            <span className={styles.ar}>
              <Icon name="arrow" />
            </span>
          </button>
          <button type="button" className={styles.lrow} onClick={() => go("/privacy")}>
            <Icon name="shield" />
            プライバシー
            <span className={styles.ar}>
              <Icon name="arrow" />
            </span>
          </button>
          <button
            type="button"
            className={styles.lrow}
            onClick={account.askLogout}
            disabled={account.busy}
          >
            <Icon name="exit" />
            ログアウト
          </button>
          <button
            type="button"
            className={`${styles.lrow} ${styles.danger}`}
            onClick={account.askDelete}
            disabled={account.busy}
          >
            <Icon name="trash" />
            アカウントを削除
          </button>
        </Paper>
      </div>

      <div className={styles.nav}>
        <div className={styles.back}>
          <RoundButton
            variant="chalk"
            icon="arrowL"
            size={64}
            aria-label="もどる"
            onClick={() => {
              sound("tick");
              router.push("/home");
            }}
          />
        </div>
      </div>

      <GoogleSheet account={account} />

      <ConfirmDialog
        kind={account.dialog}
        conflictEmail={account.conflict?.email}
        linked={account.linked}
        onClose={() => {
          if (account.dialog === "conflict") account.dismissConflict();
          else account.closeDialog();
        }}
        onLink={account.openSheet}
        onLogout={() => void account.logout()}
        onDelete={() => void account.deleteAccount()}
        onRelogin={() => void account.reloginWithConflict()}
        onReauth={() => void account.reauthAndDelete()}
      />
    </Desk>
  );
}
