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
  | "too_few_records" // 409（手紙：今週の記録が足りない）
  | "already_generating" // 409（手紙：生成中）
  | "not_available" // 409（手紙：まだ開けない週）
  | "rate_limited" // 429（IP 単位。Phase 12b の 53）
  | "incomplete_response" // 422（refusal・max_tokens）
  | "save_failed" // 502
  | "update_failed" // 502
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
export type CreateThoughtResponse = { id: string; title: string; date: string };

/** GET /api/thoughts/[id] */
export type ThoughtResponse = { thought: ThoughtSummary };

/** PUT /api/thoughts/[id]（本文・深掘りの答えを直す。あとから深掘りを足すときは question も送る） */
export type UpdateThoughtRequest = {
  rawText?: string;
  deepDiveQuestion?: string;
  deepDiveAnswer?: string;
};
export type UpdateThoughtResponse = { ok: true; title: string };

/** DELETE /api/thoughts/[id]（chunks・手紙の引用も処理する） */
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
 *  - status "generating": 生成中（別タブなど）。letter なし
 *  - status "none"     : 条件は満たすが未生成（POST で生成する）。letter なし */
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

/** POST /api/letters/current：NDJSON ストリーム（1行1JSON）。失敗は HTTP エラーか { type: "error" } 行 */
export type LetterStreamEvent =
  | { type: "start"; weekKey: string }
  | { type: "delta"; text: string }
  | { type: "done"; letter: Letter }
  | { type: "error"; error: ApiErrorCode };

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
