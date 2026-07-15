// 利用上限の一元管理。会員側の値を変えればゲスト側も自動で追従する

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
