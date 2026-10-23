"use client";

// 設定のアカウント欄（PLAN 49・50）。
// - useAccount：Google 連携（linkWithPopup・uid そのまま）／使用中のときのログインし直し／ログアウト／削除
// - AccountCard：ゲスト＝「30日使わないと消える」と緑の「守る」／連携済み＝メールと上限が広がったこと
// - GoogleSheet：「守る」で下から出るシート。Google の公式ボタン（ブランドガイドラインどおり）から連携する
// 文言はプロトタイプ ui-v5 の renderSettings / gsheet のとおり。

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUser,
  GoogleAuthProvider,
  linkWithPopup,
  onIdTokenChanged,
  reauthenticateWithPopup,
  signInWithCredential,
  signOut,
  type OAuthCredential,
  type User,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import Icon from "@/components/ui/Icon";
import { requestToast, showToast } from "@/components/ui/Toast";
import { auth, googleProvider } from "@/lib/db/firebase";
import { appCheckHeaders } from "@/lib/db/appCheck";
import { authedFetch, type AppUser } from "@/lib/db/useUser";
import { sound, vibrate } from "@/lib/ui/feedback";
import { clearPersonalLocalData } from "@/lib/ui/localData";
import {
  authCode,
  authErrorMessage,
  classifyAuthError,
  linkedLimitsText,
  logoutDialogFor,
  needsReauthBeforeDelete,
  reloginToast,
  type SettingsDialogKind,
} from "@/lib/auth/link";
import styles from "./settings.module.css";

function emailOf(u: User | null): string | null {
  if (!u) return null;
  return u.email ?? u.providerData.find((p) => p.providerId === "google.com")?.email ?? null;
}

function toastError(e: unknown): void {
  const msg = authErrorMessage(classifyAuthError(authCode(e)));
  if (msg) showToast(msg);
}

export type AccountState = ReturnType<typeof useAccount>;

/** 設定のアカウント操作（契約 §9 の useAccount に相当。ダイアログの状態もここで持つ） */
export function useAccount(user: AppUser) {
  const router = useRouter();
  const [linked, setLinked] = useState(!user.isGuest);
  const [email, setEmail] = useState<string | null>(() => emailOf(auth.currentUser));
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<SettingsDialogKind | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [conflict, setConflict] = useState<{ email: string | null; credential: OAuthCredential } | null>(
    null,
  );

  // 連携するとトークンが作り直されるので、ここで「つながった」を拾う
  useEffect(
    () =>
      onIdTokenChanged(auth, (u) => {
        if (!u) return;
        setLinked(!u.isAnonymous);
        setEmail(emailOf(u));
      }),
    [],
  );

  const openSheet = useCallback(() => {
    vibrate(10);
    sound("pop");
    setSheetOpen(true);
  }, []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  /** Google 連携（ゲスト → Google。uid が変わらないので記録はそのまま） */
  const link = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await linkWithPopup(current, googleProvider);
      // 上限（会員の値）はトークンの sign_in_provider で決まるので、すぐ作り直す
      await res.user.getIdToken(true);
      setSheetOpen(false);
      vibrate([14, 26, 18]);
      sound("chime");
      // ゲストかどうかを全画面で持ち直すため読み込み直す（トーストは読み込み後に出す）
      requestToast("Googleとつながりました。記録はそのまま引き継がれます。");
      window.location.reload();
    } catch (e) {
      const kind = classifyAuthError(authCode(e));
      if (kind === "conflict") {
        const credential = GoogleAuthProvider.credentialFromError(e as FirebaseError);
        const conflictEmail =
          (e as { customData?: { email?: string } }).customData?.email ?? null;
        setSheetOpen(false);
        if (credential) {
          setConflict({ email: conflictEmail, credential });
          setDialog("conflict");
        } else {
          showToast("このGoogleアカウントは、すでに MindWind で使われています。");
        }
      } else {
        toastError(e);
      }
      setBusy(false);
    }
  }, [busy]);

  /**
   * 使用中の Google アカウントでログインし直す（確認後）。
   * 先にログインし直し、成功してからゲストの記録を消す（失敗しても記録は失わない）。
   * ゲストの匿名ユーザー自体は deleteUser すると新しいログインまで外れるので消さない（データは空。54 の掃除で消える）。
   */
  const reloginWithConflict = useCallback(async () => {
    const guest = auth.currentUser;
    if (!conflict || !guest || busy) return;
    setBusy(true);
    try {
      const guestToken = guest.isAnonymous ? await guest.getIdToken() : null;
      const res = await signInWithCredential(auth, conflict.credential);
      if (guestToken) {
        try {
          await fetch("/api/account", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${guestToken}`, ...(await appCheckHeaders()) },
          });
        } catch {
          // 消せなくても、ゲストの記録は 30 日後の掃除で消える
        }
      }
      // ゲストの下書きなど端末に残る値も、人が替わるので消す
      clearPersonalLocalData();
      setConflict(null);
      requestToast(reloginToast(emailOf(res.user) ?? conflict.email));
      router.replace("/home");
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  }, [conflict, busy, router]);

  const dismissConflict = useCallback(() => {
    setConflict(null);
    setDialog(null);
  }, []);

  const logout = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut(auth);
      // 共有の端末を考えて、下書きなど本人に関わる端末内の値も消す（音・振動の好みは残す）
      clearPersonalLocalData();
      requestToast("ログアウトしました");
      router.replace("/");
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  }, [busy, router]);

  /** 本人確認のあとの削除（Firestore を全部消し、端末の下書きも消してから Auth のユーザーを消す） */
  const finishDelete = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    const res = await authedFetch(user, "/api/account", { method: "DELETE" });
    if (!res.ok) throw new Error(`account ${res.status}`);
    // サーバーのデータが消えたら、端末に残る下書き（日記の本文）なども消す（憲法第13条。次のゲストに復元させない）
    clearPersonalLocalData();
    try {
      await deleteUser(current);
    } catch {
      // データは消えている。Auth が残っても出ておく（ゲストは 54 の掃除で消える）
      await signOut(auth).catch(() => {});
    }
    requestToast("すべて削除しました");
    router.replace("/");
  }, [user, router]);

  /** 長押しで削除（Google は先に再認証・ゲストは省く） */
  const deleteAccount = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || busy) return;
    setBusy(true);
    try {
      if (needsReauthBeforeDelete(current.isAnonymous)) {
        try {
          await reauthenticateWithPopup(current, googleProvider);
        } catch (e) {
          const kind = classifyAuthError(authCode(e));
          // 長押しの終わりはタップ扱いにならずポップアップが止められることがある → タップで本人確認
          if (kind === "blocked") setDialog("reauth");
          else toastError(e);
          setBusy(false);
          return;
        }
      }
      await finishDelete();
    } catch (e) {
      if (authCode(e)) toastError(e);
      else showToast("削除できませんでした。少し待ってから、もう一度試してね。");
      setBusy(false);
    }
  }, [busy, finishDelete]);

  /** 本人確認ダイアログのボタン（タップなのでポップアップが開ける） */
  const reauthAndDelete = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || busy) return;
    setBusy(true);
    try {
      await reauthenticateWithPopup(current, googleProvider);
      await finishDelete();
    } catch (e) {
      if (authCode(e)) toastError(e);
      else showToast("削除できませんでした。少し待ってから、もう一度試してね。");
      setBusy(false);
    }
  }, [busy, finishDelete]);

  return {
    linked,
    email,
    busy,
    dialog,
    setDialog,
    closeDialog: () => setDialog(null),
    askLogout: () => setDialog(logoutDialogFor(!linked)),
    askDelete: () => setDialog("delete"),
    conflict,
    sheetOpen,
    openSheet,
    closeSheet,
    link,
    reloginWithConflict,
    dismissConflict,
    logout,
    deleteAccount,
    reauthAndDelete,
  };
}

/** 信頼の文言（PLAN 49 の G。プライバシーポリシー「AI サービスへの送信」「相談の会話」と一致させる） */
export const TRUST_LINES = [
  "日記や相談は、AI の学習には使われません。",
  "相談の会話は、あなたの記録には入れません。",
  "Googleでつなぐと、記録をそのまま引き継げます。",
] as const;

export default function AccountCard({ account }: { account: AccountState }) {
  const { linked, email, busy, openSheet } = account;
  return (
    <Paper as="section" className={styles.card} aria-label="アカウント">
      <h3>アカウント</h3>
      {linked ? (
        <div className={`${styles.acct} ${styles.linked}`}>
          <div className={styles.badge}>
            <Icon name="shield" />
          </div>
          <div className={styles.tx}>
            <b>Googleでつながっています</b>
            {email}
            <small>
              記録はこのアカウントに守られています。どの端末からでも続けられます。{linkedLimitsText()}
            </small>
          </div>
        </div>
      ) : (
        <div className={styles.acct}>
          <div className={styles.badge}>
            <Icon name="bookmark" />
          </div>
          <div className={styles.tx}>
            <b>ゲスト</b>
            いまは、この端末のブラウザだけで使っています。
            <small>30日使わないと、記録が消えます。端末を変えたり、ブラウザのデータを消すと戻れません。</small>
          </div>
          <RoundButton
            variant="green"
            icon="shield"
            label="守る"
            size={68}
            aria-label="Googleでデータを守る"
            onClick={openSheet}
            disabled={busy}
            className={styles.linkBtn}
          />
        </div>
      )}
      <ul className={styles.trust}>
        {TRUST_LINES.map((t) => (
          <li key={t}>
            <Icon name="check" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </Paper>
  );
}

/** Google の公式「G」ロゴ（色・形を変えない） */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** 「守る」で下から出るシート。Google の公式ボタン（Sign in with Google のブランドガイドライン：白・G ロゴ・「Google で続ける」） */
export function GoogleSheet({ account }: { account: AccountState }) {
  const { sheetOpen, closeSheet, link, busy } = account;

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  return (
    <>
      <div
        className={`${styles.sheetVeil} ${sheetOpen ? styles.show : ""}`}
        onClick={closeSheet}
        aria-hidden="true"
      />
      <div
        className={`${styles.gsheet} ${sheetOpen ? styles.show : ""}`}
        role="dialog"
        aria-label="Googleでデータを守る"
        aria-hidden={!sheetOpen}
        inert={!sheetOpen}
      >
        <div className={styles.gh}>Googleでデータを守る</div>
        <div className={styles.gs}>
          つなぐと、いまの記録はそのまま引き継がれます。どの端末からでも続けられ、1日の上限も広がります。
          <br />
          このあとGoogleの画面が開きます。
        </div>
        <div className={styles.gActions}>
          <RoundButton variant="ink" icon="arrowL" label="やめる" aria-label="やめる" onClick={closeSheet} />
          <button
            type="button"
            className={styles.gbtn}
            onClick={() => void link()}
            disabled={busy}
          >
            <GoogleG />
            <span>Google で続ける</span>
          </button>
        </div>
      </div>
    </>
  );
}
