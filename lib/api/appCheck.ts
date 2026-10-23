// Firebase App Check のサーバー側検証（PLAN 52）。proxy.ts から /api/* に対して呼ぶ。
//
// ENFORCE_APP_CHECK で段階的に強制する：
//   off（既定・開発）… 何もしない
//   monitor        … 検証して、失敗をログに出すだけ（通す）。本番で数日ようすを見る段階
//   enforce        … 失敗したら 401 { error: "app_check_failed" }
//
// firebase-admin は off のときに読み込まない（開発で Admin の鍵が無くても動くように）。

export type AppCheckMode = "off" | "monitor" | "enforce";

export const APP_CHECK_HEADER = "x-firebase-appcheck";

export const APP_CHECK_MESSAGE = "うまく確認できなかったよ。ページを開き直してみてね。";

export function appCheckMode(value: string | undefined): AppCheckMode {
  const v = value?.trim().toLowerCase();
  if (v === "enforce" || v === "true" || v === "1") return "enforce";
  if (v === "monitor") return "monitor";
  return "off";
}

/** App Check トークンを検証する。正しければ true */
export async function verifyAppCheckToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    await import("@/lib/db/admin"); // Admin アプリの初期化（副作用）
    const { getApps } = await import("firebase-admin/app");
    const { getAppCheck } = await import("firebase-admin/app-check");
    await getAppCheck(getApps()[0]).verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

export type AppCheckResult = { ok: true } | { ok: false };

/** モードに従って判定する。monitor は失敗してもログだけで ok */
export async function checkAppCheck(
  headers: Headers,
  mode: AppCheckMode = appCheckMode(process.env.ENFORCE_APP_CHECK),
  verify: (token: string | null) => Promise<boolean> = verifyAppCheckToken
): Promise<AppCheckResult> {
  if (mode === "off") return { ok: true };
  const valid = await verify(headers.get(APP_CHECK_HEADER));
  if (valid) return { ok: true };
  if (mode === "monitor") {
    console.warn("[appCheck] invalid or missing token (monitor mode, allowed)");
    return { ok: true };
  }
  return { ok: false };
}
