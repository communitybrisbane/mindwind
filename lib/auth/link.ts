// 設定画面のアカウント操作（PLAN 49・50）の純粋ロジック。Firebase を import しない（Vitest で確かめる）。
// 画面の文言はプロトタイプ docs/prototype/ui-v5.html の renderSettings / #rowOut / #rowDel / gsheet のとおり。

import { MAX_NICKNAME_LENGTH, MEMBER_LIMITS } from "@/lib/logic/limits";

/** Firebase Auth のエラーからコードを取り出す（無ければ ""） */
export function authCode(e: unknown): string {
  if (typeof e !== "object" || e === null) return "";
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

/** 連携（linkWithPopup）・本人確認（reauthenticateWithPopup）の失敗の種類 */
export type LinkErrorKind =
  /** その Google アカウントはもう MindWind で使われている → 「ログインし直す」確認へ */
  | "conflict"
  /** 本人がポップアップを閉じた・二重に開いた → 何も出さない */
  | "dismissed"
  /** ポップアップがブロックされた → タップでもう一度 */
  | "blocked"
  /** 通信できない */
  | "network"
  /** 本人確認が古い（削除の前など） */
  | "recent_login"
  /** 別の Google アカウントで本人確認した */
  | "mismatch"
  | "failed";

export function classifyAuthError(code: string): LinkErrorKind {
  switch (code) {
    case "auth/credential-already-in-use":
    case "auth/email-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "conflict";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "dismissed";
    case "auth/popup-blocked":
      return "blocked";
    case "auth/network-request-failed":
      return "network";
    case "auth/requires-recent-login":
      return "recent_login";
    case "auth/user-mismatch":
      return "mismatch";
    default:
      return "failed";
  }
}

/** トーストに出す文言（dismissed / conflict は出さない＝null） */
export function authErrorMessage(kind: LinkErrorKind): string | null {
  switch (kind) {
    case "dismissed":
    case "conflict":
      return null;
    case "blocked":
      return "Google の画面が開けませんでした。もう一度押してください。";
    case "network":
      return "つながりませんでした。通信を確かめて、もう一度試してね。";
    case "mismatch":
      return "いまログインしている Google アカウントを選んでください。";
    case "recent_login":
      return "もう一度、Google で本人確認をしてください。";
    default:
      return "うまくいきませんでした。少し待ってから、もう一度試してね。";
  }
}

/** 連携済みのアカウント欄に添える上限の説明（limits.ts から） */
export function linkedLimitsText(): string {
  return `1日の上限も広がっています（記録${MEMBER_LIMITS.recordPerDay}・相談${MEMBER_LIMITS.consultPerDay}）。`;
}

/** 呼び名の保存値：trim して最大12文字（サーバー PUT /api/profile と同じ数え方＝コードポイント） */
export function normalizeNickname(input: string): string {
  return Array.from(input.trim()).slice(0, MAX_NICKNAME_LENGTH).join("");
}

/**
 * 呼び名の下の説明（プロトタイプ #nameHint）。
 * autoName は「風見」のように「さん」なし。
 */
export function nicknameHint(nickname: string, autoName: string): string {
  const nick = nickname.trim();
  return nick
    ? `「${nick}さん」と呼びます。空にすると、自動の呼び名（${autoName}さん）に戻ります。`
    : `いまは自動の呼び名（${autoName}さん）です。好きな呼び名を入れると、そう呼びます。`;
}

/** 削除の前に Google の本人確認が要るか（ゲストは省く） */
export function needsReauthBeforeDelete(isGuest: boolean): boolean {
  return !isGuest;
}

/** 設定画面のダイアログの種類 */
export type SettingsDialogKind = "logoutGuest" | "logoutLinked" | "delete" | "conflict" | "reauth";

/** ログアウトを押したときのダイアログ（ゲストは警告して「つなぐ」も出す） */
export function logoutDialogFor(isGuest: boolean): SettingsDialogKind {
  return isGuest ? "logoutGuest" : "logoutLinked";
}

/** 使用中のアカウントの呼び方（メールがなければ「その」） */
export function conflictAccountLabel(email: string | null | undefined): string {
  const e = (email ?? "").trim();
  return e ? `「${e}」のアカウント` : "そのアカウント";
}

/** ログインし直したあとのトースト */
export function reloginToast(email: string | null | undefined): string {
  const e = (email ?? "").trim();
  return e
    ? `${e} のアカウントに入りました。ゲストの記録は消えました。`
    : "Google のアカウントに入りました。ゲストの記録は消えました。";
}

/** 自動保存の待ち時間（打ち終わってから保存する） */
export const NICKNAME_SAVE_DELAY_MS = 600;
