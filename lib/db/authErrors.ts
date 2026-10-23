/** Firebase Auth のエラーコード（無ければ ""） */
export function authErrorCode(e: unknown): string {
  return (e as { code?: string }).code ?? "";
}

/** ポップアップをユーザー自身が閉じた／重複して開いた（エラー扱いしない） */
export function isPopupDismissed(code: string): boolean {
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}
