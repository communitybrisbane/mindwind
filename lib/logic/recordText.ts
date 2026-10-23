// 記録（thoughts）の保存・編集・一覧で使う純粋ロジック（Firestore・AI を呼ばない。Vitest 対象）。
// 本人の文章は書き換えない：rawText / deepDiveAnswer は検証するだけで、そのまま保存する（一言だけは前後の空白を落とす）。
import { SHAPED_FIELDS, type ShapedRecord, type ThoughtKind, type ThoughtSummary } from "@/lib/db/types";
import { resolveRecordDate } from "@/lib/logic/backdate";
import { MAX_DIARY_LENGTH, MIN_DIARY_LENGTH } from "@/lib/logic/limits";
import { charLength, toMood, validateQuickText } from "@/lib/logic/quickRecord";
import { autoTitle } from "@/lib/logic/title";

/* ---------- embedding の入力（タイトルは lib/logic/title.ts） ---------- */

/** チャンクの embedding の入力（契約 §5）。meta があれば `${text}\n${meta}`、なければ text */
export function embeddingInput(text: string, meta?: string): string {
  return meta ? `${text}\n${meta}` : text;
}

/* ---------- 入力の検証 ---------- */

export type RecordInputError = "invalid_body" | "too_short" | "too_long" | "invalid_date";

/** HTTP ステータス（契約 §6：検証エラーはすべて 400） */
export const INPUT_ERROR_STATUS = 400;

type Fail = { ok: false; error: RecordInputError };

export type CreateThoughtInput = {
  rawText: string;
  deepDiveQuestion: string;
  deepDiveAnswer: string;
  kind: ThoughtKind;
  date: string;
  isPast: boolean;
};

/** 任意の文字列項目：未指定は ""、文字列でなければ null（invalid_body） */
function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : null;
}

/** 日記本文（full）の長さ：trim 後 10 文字以上・5000 文字以下 */
function checkDiary(rawText: string): RecordInputError | null {
  if (rawText.trim().length < MIN_DIARY_LENGTH) return "too_short";
  if (charLength(rawText) > MAX_DIARY_LENGTH) return "too_long";
  return null;
}

/** 深掘りの質問・答えの長さ（各 5000 文字まで） */
function checkDeepDive(question: string, answer: string): RecordInputError | null {
  if (charLength(question) > MAX_DIARY_LENGTH || charLength(answer) > MAX_DIARY_LENGTH) return "too_long";
  return null;
}

/** POST /api/thoughts の本文（CreateThoughtRequest）を検証して保存する値にする */
export function parseCreateThought(body: unknown, todayKey: string): { ok: true; value: CreateThoughtInput } | Fail {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  if (typeof b.rawText !== "string") return { ok: false, error: "invalid_body" };
  const kindRaw = b.kind ?? "full";
  if (kindRaw !== "full" && kindRaw !== "quick") return { ok: false, error: "invalid_body" };
  const kind: ThoughtKind = kindRaw;

  const question = optionalString(b.deepDiveQuestion);
  const answer = optionalString(b.deepDiveAnswer);
  if (question === null || answer === null) return { ok: false, error: "invalid_body" };

  let rawText: string;
  let deepDiveQuestion = question;
  let deepDiveAnswer = answer;
  if (kind === "quick") {
    const quick = validateQuickText(b.rawText);
    if (!quick.ok) return { ok: false, error: quick.error };
    rawText = quick.text;
    // 一言は保存時に深掘りを持たない（あとから PUT で足す。65）
    deepDiveQuestion = "";
    deepDiveAnswer = "";
  } else {
    const err = checkDiary(b.rawText) ?? checkDeepDive(question, answer);
    if (err) return { ok: false, error: err };
    rawText = b.rawText;
  }

  const resolved = resolveRecordDate(b.date, todayKey);
  if (!resolved.ok) return { ok: false, error: "invalid_date" };

  return {
    ok: true,
    value: { rawText, deepDiveQuestion, deepDiveAnswer, kind, date: resolved.date, isPast: resolved.isPast },
  };
}

export type EditableFields = { rawText: string; deepDiveQuestion: string; deepDiveAnswer: string };

/**
 * PUT /api/thoughts/[id] の本文（UpdateThoughtRequest）を、いまの記録に重ねて検証する。
 * 送られた項目だけ置き換える。1つも無ければ invalid_body。本文の長さは記録の kind に従う。
 */
export function parseUpdateThought(
  body: unknown,
  current: EditableFields & { kind: ThoughtKind }
): { ok: true; value: EditableFields } | Fail {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;
  const keys = ["rawText", "deepDiveQuestion", "deepDiveAnswer"] as const;
  if (!keys.some((k) => b[k] !== undefined)) return { ok: false, error: "invalid_body" };
  for (const k of keys) {
    if (b[k] !== undefined && typeof b[k] !== "string") return { ok: false, error: "invalid_body" };
  }

  let rawText = current.rawText;
  if (typeof b.rawText === "string") {
    if (current.kind === "quick") {
      const quick = validateQuickText(b.rawText);
      if (!quick.ok) return { ok: false, error: quick.error };
      rawText = quick.text;
    } else {
      const err = checkDiary(b.rawText);
      if (err) return { ok: false, error: err };
      rawText = b.rawText;
    }
  }
  const deepDiveQuestion = typeof b.deepDiveQuestion === "string" ? b.deepDiveQuestion : current.deepDiveQuestion;
  const deepDiveAnswer = typeof b.deepDiveAnswer === "string" ? b.deepDiveAnswer : current.deepDiveAnswer;
  const err = checkDeepDive(deepDiveQuestion, deepDiveAnswer);
  if (err) return { ok: false, error: err };

  return { ok: true, value: { rawText, deepDiveQuestion, deepDiveAnswer } };
}

/* ---------- 読み出し ---------- */

/** Firestore の Timestamp（toDate を持つ）・Date・文字列を ISO 文字列にする。読めなければ undefined */
export function toIsoString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

/**
 * Firestore の thought ドキュメントを ThoughtSummary にする（embedding は返さない）。
 * 旧データ（kind・深掘りなし、旧 6 項目あり）も読めるように既定値を補う。
 * 旧 6 項目は旧 UI が移行完了まで使うので残す（80 で整理）。
 */
export function toThoughtSummary(id: string, data: Record<string, unknown>): ThoughtSummary {
  const rest: Record<string, unknown> = { ...data };
  delete rest.embedding;
  delete rest.createdAt;
  delete rest.mood;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const summary: ThoughtSummary = {
    ...(rest as object),
    id,
    date: str(data.date),
    rawText: str(data.rawText),
    deepDiveQuestion: str(data.deepDiveQuestion),
    deepDiveAnswer: str(data.deepDiveAnswer),
    title: str(data.title) || autoTitle(str(data.rawText)),
    kind: data.kind === "quick" ? "quick" : "full",
  };
  const mood = toMood(data.mood);
  if (mood !== undefined) summary.mood = mood;
  const createdAt = toIsoString(data.createdAt);
  if (createdAt) summary.createdAt = createdAt;
  return summary;
}

/** 新しい順（createdAt の降順。無いものは後ろ） */
export function sortNewestFirst(thoughts: ThoughtSummary[]): ThoughtSummary[] {
  return [...thoughts].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/* ---------- 旧 UI（移行完了まで） ---------- */

/**
 * @deprecated 成形（6項目）は廃止。相談の RAG ブロック（lib/ai/rag.ts・58 が置き換える）が旧記録に使う間だけ残す。
 * 6項目を「項目名：内容」の行で連結する（ラベルから「（AIの気づき）」を除く）。
 */
export function formatShapedFields(record: Omit<ShapedRecord, "title">): string {
  return SHAPED_FIELDS.map(({ key, label }) => {
    const plainLabel = label.replace("（AIの気づき）", "");
    return `${plainLabel}：${record[key]}`;
  }).join("\n");
}
