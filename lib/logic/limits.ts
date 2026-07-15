// 利用上限の一元管理。会員側の値を変えればゲスト側も自動で追従する

/** 日記の最短文字数（未満は AI を呼ばずやさしく促す。クライアント・API 共通） */
export const MIN_DIARY_LENGTH = 10;

/** 入力サイズの上限（AI トークン費用と悪用のガード。超過はサーバーが 400 を返す） */
export const MAX_DIARY_LENGTH = 5000; // 日記・深掘り回答
export const MAX_CONSULT_MESSAGE = 2000; // 相談の1メッセージ
export const MAX_SHAPED_FIELD = 2000; // 成形カードの各項目
export const MAX_TITLE_LENGTH = 50; // タイトル（AI 生成は15字だが編集の余地を残す）

/** 相談に必要な最低記録数（未満はコールドスタート案内。文言にも使う） */
export const MIN_THOUGHTS_FOR_CONSULT = 3;

export const MEMBER_LIMITS = {
  /** 記録の上限（件/日）。実質無限の安全上限（暴走・悪用ガード） */
  recordPerDay: 30,
  /** 相談の上限（メッセージ/日） */
  consultPerDay: 30,
};

/** ゲストは会員の 1/10（最低1件は保証・切り捨て） */
export const GUEST_RATIO = 1 / 10;

export function guestLimit(memberLimit: number): number {
  return Math.max(1, Math.floor(memberLimit * GUEST_RATIO));
}

/** 記録の上限：ゲストは会員の 1/10 */
export function recordLimitFor(isGuest: boolean): number {
  return isGuest ? guestLimit(MEMBER_LIMITS.recordPerDay) : MEMBER_LIMITS.recordPerDay;
}

/** 相談の上限：ゲストは会員の 1/10 */
export function consultLimitFor(isGuest: boolean): number {
  return isGuest ? guestLimit(MEMBER_LIMITS.consultPerDay) : MEMBER_LIMITS.consultPerDay;
}
