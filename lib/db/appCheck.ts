// Firebase App Check のクライアント初期化（PLAN 52・reCAPTCHA Enterprise）。ブラウザ専用。
//
// NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY が無いときは何もしない（開発で鍵が無くても動く）。
// 開発で本物の鍵を使わずに試すときは NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN を入れる
// （Firebase Console → App Check → アプリ → デバッグトークンを管理 で登録した値。"true" ならコンソールに新しい値が出る）。
//
// authedFetch（lib/db/useUser.ts）が appCheckHeaders() を毎回のリクエストに付ける。サーバー側の検証は lib/api/appCheck.ts。

import { getApps } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import "@/lib/db/firebase"; // クライアントの Firebase アプリを初期化（副作用）

let instance: AppCheck | null | undefined;

declare global {
  // Firebase が読むデバッグ用のグローバル
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

/** App Check を1回だけ初期化する。鍵が無い・SSR のときは null */
export function initAppCheck(): AppCheck | null {
  if (instance !== undefined) return instance;
  if (typeof window === "undefined") return null;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  const app = getApps()[0];
  if (!siteKey || !app) {
    instance = null;
    return instance;
  }
  const debug = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
  if (debug && process.env.NODE_ENV !== "production") {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debug === "true" ? true : debug;
  }
  instance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return instance;
}

/** API 呼び出しに付けるヘッダー。取れないときは空（サーバーが off/monitor なら通る） */
export async function appCheckHeaders(): Promise<Record<string, string>> {
  const ac = initAppCheck();
  if (!ac) return {};
  try {
    const { token } = await getToken(ac, false);
    return token ? { "X-Firebase-AppCheck": token } : {};
  } catch {
    return {};
  }
}
