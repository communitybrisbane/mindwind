// 利用上限の一元管理。会員側の値を変えればゲスト側も自動で追従する

/** 日記の最短文字数（未満は AI を呼ばずやさしく促す。クライアント・API 共通） */
export const MIN_DIARY_LENGTH = 10;

/** 日記が最短文字数に満たないときのトースト文言 */
export const DIARY_TOO_SHORT_MESSAGE = `もう少し書いてみてね（${MIN_DIARY_LENGTH}文字以上）`;

/** 入力サイズの上限（AI トークン費用と悪用のガード。超過はサーバーが 400 を返す） */
export const MAX_DIARY_LENGTH = 5000; // 日記・深掘り回答
export const MAX_CONSULT_MESSAGE = 2000; // 相談の1メッセージ
/** @deprecated 成形（shape）は廃止予定（Phase 12〜19）。80 で消す */
export const MAX_SHAPED_FIELD = 2000; // 成形カードの各項目
export const MAX_TITLE_LENGTH = 50; // タイトル（AI 生成は15字だが編集の余地を残す）

/** 相談に必要な最低記録数（未満はコールドスタート案内。文言にも使う） */
export const MIN_THOUGHTS_FOR_CONSULT = 3;

export const MEMBER_LIMITS = {
  /** 記録の上限（件/日）。実質無限の安全上限（暴走・悪用ガード） */
  recordPerDay: 30,
  /** 相談の上限（メッセージ/日） */
  consultPerDay: 30,
  /** 深掘りの上限（回/日）。記録上限の3倍（やり直しの余裕） */
  deepdivePerDay: 90,
  /** 成形の上限（回/日）。記録上限の3倍（やり直しの余裕） */
  /** @deprecated 成形（shape）は廃止予定。80 で消す */
  shapePerDay: 90,
  /** 手紙の生成上限（回/日。やり直し込み。ゲストは 1/10 → 1） */
  letterPerDay: 3,
};

/** 一言（quick 記録）の文字数（trim 後） */
export const MAX_QUICK_LENGTH = 60; // 上限
export const MIN_QUICK_LENGTH = 2; // 最短

/** 呼び名の最大文字数（空なら自動の呼び名） */
export const MAX_NICKNAME_LENGTH = 12;

/** 記録のタイトル（本文の先頭から自動）の最大文字数 */
export const MAX_AUTO_TITLE_LENGTH = 20;

/** 上限の約9割から文字数カウンターを赤字にする */
export const LIMIT_WARN_RATIO = 0.9;

/** 今週の記録がこの日数以上で手紙を書く */
export const MIN_THOUGHTS_FOR_LETTER = 3;

/** 再会カードを出す最少の記録数 */
export const MIN_THOUGHTS_FOR_REUNION = 5;

/** 歯車の赤い点を再表示するまでの日数 */
export const NUDGE_REPEAT_DAYS = 7;

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

/** 深掘りの上限：ゲストは会員の 1/10 */
export function deepdiveLimitFor(isGuest: boolean): number {
  return isGuest ? guestLimit(MEMBER_LIMITS.deepdivePerDay) : MEMBER_LIMITS.deepdivePerDay;
}

/** @deprecated 成形（shape）は廃止予定。80 で消す */
/** 成形の上限：ゲストは会員の 1/10 */
export function shapeLimitFor(isGuest: boolean): number {
  return isGuest ? guestLimit(MEMBER_LIMITS.shapePerDay) : MEMBER_LIMITS.shapePerDay;
}

/** 手紙の生成上限：ゲストは会員の 1/10（最低1） */
export function letterLimitFor(isGuest: boolean): number {
  return isGuest ? guestLimit(MEMBER_LIMITS.letterPerDay) : MEMBER_LIMITS.letterPerDay;
}

/** カウンターが赤くなり始める文字数（上限の約9割・切り上げ） */
export function warnAtFor(max: number): number {
  return Math.ceil(max * LIMIT_WARN_RATIO);
}
