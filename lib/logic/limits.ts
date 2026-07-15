// 利用上限の一元管理。会員側の値を変えればゲスト側も自動で追従する

export const MEMBER_LIMITS = {
  /** 記録の上限（件/日） */
  recordPerDay: 3,
  /** 相談の上限（メッセージ/日） */
  consultPerDay: 30,
};

/** ゲストは会員の 1/10（最低1件は保証・切り捨て） */
export const GUEST_RATIO = 1 / 10;

export function guestLimit(memberLimit: number): number {
  return Math.max(1, Math.floor(memberLimit * GUEST_RATIO));
}

/** 記録の上限：ゲストも会員と同じ（記録体験はフルで見せる方針） */
export function recordLimitFor(): number {
  return MEMBER_LIMITS.recordPerDay;
}

/** 相談の上限：ゲストは会員の 1/10 */
export function consultLimitFor(isGuest: boolean): number {
  return isGuest ? guestLimit(MEMBER_LIMITS.consultPerDay) : MEMBER_LIMITS.consultPerDay;
}
