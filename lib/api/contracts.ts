// 新 API（Phase 12〜19）のリクエスト・レスポンスの型。正は docs/IMPLEMENTATION-CONTRACT.md §6。
// API Route とクライアントの両方からこのファイルを import して、形を揃える（実装の持ち主は契約書の §7）。

import type {
  DayEntry,
  Letter,
  LetterSummary,
  MoodId,
  Profile,
  ThoughtKind,
  ThoughtSummary,
} from "@/lib/db/types";

/* ---------- 共通 ---------- */

/** エラー応答は常に { error: ApiErrorCode }。HTTP ステータスは契約書 §6 の表 */
export type ApiErrorCode =
  | "unauthorized" // 401
  | "app_check_failed" // 401（Phase 12b の 52）
  | "invalid_body" // 400
  | "invalid_date" // 400（"YYYY-MM-DD" でない・未来日）
  | "invalid_range" // 400（from > to・366日超）
  | "invalid_mood" // 400（0〜4 でない）
  | "too_short" // 400（最短文字数未満）
  | "too_long" // 400（上限超え）
  | "not_found" // 404
  | "daily_limit" // 記録=409／AI=429
  | "date_taken" // 409（過去日は1日1件）
  | "conflict" // 409（編集：別の画面が先に同じ記録を直した。開き直してやり直す）
  | "too_few_records" // 409（手紙：今週の記録が足りない）
  | "not_available" // 409（手紙：まだ開けない週）
  | "rate_limited" // 429（IP 単位。Phase 12b の 53）
  | "incomplete_response" // 422（refusal・max_tokens）
  | "save_failed" // 502
  | "update_failed" // 502
  | "delete_failed" // 502（相談・手紙に残る写しを伏せられなかった。記録は消していない）
  | "ai_failed"; // 502

export type ApiError = { error: ApiErrorCode; retryAfter?: number };

/* ---------- /api/thoughts ---------- */

/** GET /api/thoughts[?date=YYYY-MM-DD]（date を付けるとその日の分だけ） */
export type ThoughtsListResponse = { thoughts: ThoughtSummary[] };

/** POST /api/thoughts */
export type CreateThoughtRequest = {
  rawText: string;
  /** 省略・空＝深掘りなし */
  deepDiveQuestion?: string;
  deepDiveAnswer?: string;
  /** "YYYY-MM-DD"。省略＝今日。未来は invalid_date。過去日は1日1件 */
  date?: string;
  /** 省略＝"full" */
  kind?: ThoughtKind;
};
/** crisis: 本文か深掘りの答えに危機の言葉があった（保存は成功。画面は窓口を案内する。PLAN 85・憲法第8条） */
export type CreateThoughtResponse = { id: string; title: string; date: string; crisis?: true };

/** GET /api/thoughts/[id] */
export type ThoughtResponse = { thought: ThoughtSummary };

/** PUT /api/thoughts/[id]（本文・深掘りの答えを直す。あとから深掘りを足すときは question も送る。409 conflict は開き直してやり直す） */
export type UpdateThoughtRequest = {
  rawText?: string;
  deepDiveQuestion?: string;
  deepDiveAnswer?: string;
};
/** crisis: 直した本文か答えに危機の言葉があった（保存は成功。画面は窓口を案内する） */
export type UpdateThoughtResponse = { ok: true; title: string; crisis?: true };

/** DELETE /api/thoughts/[id]（chunks も消し、相談の「読み返したページ」と手紙の引用に残る写しを伏せる） */
export type DeleteThoughtResponse = { ok: true };

/* ---------- /api/mood・/api/moods ---------- */

/** GET /api/mood（今日の気分） */
export type TodayMoodResponse = { date: string; mood: MoodId | null };

/** PUT /api/mood（今日のみ。同じ日は上書き＝選び直し） */
export type PutMoodRequest = { mood: MoodId };
export type PutMoodResponse = { date: string; mood: MoodId };

/** GET /api/moods?from=YYYY-MM-DD&to=YYYY-MM-DD（両端含む・最大366日・AI は呼ばない） */
export type MoodRangeResponse = { from: string; to: string; days: DayEntry[] };

/* ---------- /api/letters ---------- */

/** GET /api/letters/current
 *  - status "ready"    : letter あり（読める）
 *  - status "locked"   : まだ書けない（recordDays < needed）。letter なし
 *  - status "generating": 生成中（この画面が POST したあと・別タブなど）。letter なし。数秒おきに GET で取り直す
 *  - status "none"     : 条件は満たすが未生成（POST で生成する）。letter なし
 *  POST /api/letters/current も同じ形で返す（200 ready＝もう届いていた／202 generating＝裏で生成を始めた。
 *  生成は after() で最後まで続けて保存し、画面は GET で受け取る） */
export type CurrentLetterResponse = {
  weekKey: string;
  from: string;
  to: string;
  status: "ready" | "locked" | "generating" | "none";
  /** その週に記録があった日数 */
  recordDays: number;
  /** 書くのに必要な日数（limits.ts の MIN_THOUGHTS_FOR_LETTER） */
  needed: number;
  letter?: Letter;
};

/** GET /api/letters（新しい週が先） */
export type LettersListResponse = { letters: LetterSummary[] };

/** GET /api/letters/[weekKey] */
export type LetterResponse = { letter: Letter };

/** PUT /api/letters/[weekKey]（既読にする） */
export type MarkLetterReadRequest = { read: true };
export type MarkLetterReadResponse = { ok: true };

/** DELETE /api/letters/[weekKey] */
export type DeleteLetterResponse = { ok: true };

/* ---------- /api/profile ---------- */

/** GET /api/profile（未設定なら profile: null。自動の呼び名はクライアントが uid から作る） */
export type ProfileResponse = { profile: Profile | null };

/** PUT /api/profile（送った項目だけ更新＝merge。nickname は trim して12文字に切る） */
export type UpdateProfileRequest = Partial<Profile>;
export type UpdateProfileResponse = { profile: Profile };

/* ---------- /api/account ---------- */

/** DELETE /api/account（users/{uid} 以下を recursiveDelete。chunks・moods・letters も消える） */
export type DeleteAccountResponse = { ok: true };
