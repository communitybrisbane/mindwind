// 週の手紙の保存（users/{uid}/letters/{weekKey}。サーバー専用。PLAN 77・79）。
// - 生成は「開いたとき1回だけ」。始める前にトランザクションで status "generating" と genId を置き、二重生成を防ぐ
// - 止まった生成中（startedAt から GENERATING_STALE_MS 超）を作り直すときは、前の生成が使った枠の日付（usageDate）を返し、
//   呼び出し側が枠を戻せるようにする
// - 呼び出しが失敗したら、作りかけ（自分の genId のもの）を消す
// - 保存の直前に、引用した記録がまだあるかをトランザクションで確かめ、消えていれば引用を伏せる
//   （記録の削除で引用を伏せる lib/db/scrubDeleted.ts と同じ形：quote "" ・deleted: true。手紙は残す）
// Firestore は引数で受ける（admin の初期化を import しない＝純粋な部分を Vitest で試せる）。
import { randomUUID } from "node:crypto";
import { FieldPath, FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Letter, LetterBlock, LetterRef, LetterStatus, LetterSummary, MoodId } from "@/lib/db/types";
import type { LetterThought } from "@/lib/ai/letter";
import { isMoodId } from "@/lib/logic/moods";
import { toIsoString } from "@/lib/logic/recordText";
import { weekDates, weekRange } from "@/lib/logic/week";

/** 生成中のまま、この時間を過ぎたら止まったものとみなして作り直せる（API の maxDuration 300 秒＋余裕） */
export const GENERATING_STALE_MS = 6 * 60_000;

/** 過去の手紙一覧の上限（週1通なので数年分） */
export const LETTER_LIST_LIMIT = 260;

export function lettersPath(uid: string): string {
  return `users/${uid}/letters`;
}

/* ---------- 純粋ロジック ---------- */

const STATUSES: readonly LetterStatus[] = ["generating", "ready", "failed"];

function toBlocks(value: unknown, refCount: number): LetterBlock[] {
  if (!Array.isArray(value)) return [];
  const out: LetterBlock[] = [];
  for (const b of value) {
    if (!b || typeof b !== "object") continue;
    const block = b as Record<string, unknown>;
    if (block.type === "text" && typeof block.text === "string") out.push({ type: "text", text: block.text });
    else if (block.type === "quote" && Number.isInteger(block.ref) && (block.ref as number) >= 0 && (block.ref as number) < refCount) {
      out.push({ type: "quote", ref: block.ref as number });
    }
  }
  return out;
}

function toRefs(value: unknown): LetterRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((r) => {
    const ref = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const deleted = ref.deleted === true;
    return {
      thoughtId: typeof ref.thoughtId === "string" ? ref.thoughtId : "",
      date: typeof ref.date === "string" ? ref.date : "",
      // 伏せた引用は本文を返さない（保存が古くても念のため）
      quote: !deleted && typeof ref.quote === "string" ? ref.quote : "",
      ...(deleted ? { deleted: true } : {}),
    };
  });
}

/** 7日分（月〜日）の気分。無い日・壊れた値は null */
export function toMoodWeek(value: unknown): (MoodId | null)[] {
  const arr = Array.isArray(value) ? value : [];
  return Array.from({ length: 7 }, (_, i) => (isMoodId(arr[i]) ? (arr[i] as MoodId) : null));
}

/** Firestore の letters ドキュメントを Letter にする（genId・startedAt・usageDate などの内部の項目は返さない） */
export function toLetter(weekKey: string, data: Record<string, unknown>): Letter {
  const { from, to } = weekRange(weekKey);
  const refs = toRefs(data.refs);
  const status = STATUSES.includes(data.status as LetterStatus) ? (data.status as LetterStatus) : "failed";
  const letter: Letter = {
    weekKey,
    from: typeof data.from === "string" ? data.from : from,
    to: typeof data.to === "string" ? data.to : to,
    status,
    blocks: toBlocks(data.blocks, refs.length),
    refs,
    moods: toMoodWeek(data.moods),
    recordDays: typeof data.recordDays === "number" ? data.recordDays : 0,
    model: typeof data.model === "string" ? data.model : "",
    readAt: toIsoString(data.readAt) ?? null,
  };
  const createdAt = toIsoString(data.createdAt);
  if (createdAt) letter.createdAt = createdAt;
  return letter;
}

export function toLetterSummary(letter: Letter): LetterSummary {
  const s: LetterSummary = {
    weekKey: letter.weekKey,
    from: letter.from,
    to: letter.to,
    status: letter.status,
    recordDays: letter.recordDays,
    readAt: letter.readAt ?? null,
  };
  if (letter.createdAt) s.createdAt = letter.createdAt;
  return s;
}

export type ExistingLetterState = { status: unknown; startedAt: unknown } | null;

/**
 * いまある手紙のドキュメントから、生成を始めてよいかを決める。
 * - ready：もう届いている（作らない）
 * - generating：別のタブなどが生成中（作らない）。ただし startedAt から GENERATING_STALE_MS を過ぎたら止まったとみなす
 * - start：無い・failed・止まった生成中
 */
export function decideBegin(existing: ExistingLetterState, nowMs: number): "start" | "generating" | "ready" {
  if (!existing) return "start";
  if (existing.status === "ready") return "ready";
  if (existing.status === "generating") {
    const started = typeof existing.startedAt === "number" ? existing.startedAt : 0;
    return nowMs - started < GENERATING_STALE_MS ? "generating" : "start";
  }
  return "start";
}

/** 消えた記録を引いた引用を伏せる（scrubDeleted と同じ形）。元の配列は変えない */
export function maskMissingRefs(refs: LetterRef[], existingThoughtIds: Set<string>): LetterRef[] {
  return refs.map((r) =>
    existingThoughtIds.has(r.thoughtId) ? r : { thoughtId: r.thoughtId, date: r.date, quote: "", deleted: true }
  );
}

/* ---------- Firestore ---------- */

/** その週（月〜日）の記録を読む。embedding は読まない */
export async function readWeekThoughts(db: Firestore, uid: string, weekKey: string): Promise<LetterThought[]> {
  const { from, to } = weekRange(weekKey);
  const snap = await db
    .collection(`users/${uid}/thoughts`)
    .where("date", ">=", from)
    .where("date", "<=", to)
    .select("date", "rawText", "deepDiveQuestion", "deepDiveAnswer", "kind", "createdAt")
    .get();
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return snap.docs.map((doc) => {
    const t: LetterThought = {
      id: doc.id,
      date: str(doc.get("date")),
      rawText: str(doc.get("rawText")),
      deepDiveQuestion: str(doc.get("deepDiveQuestion")),
      deepDiveAnswer: str(doc.get("deepDiveAnswer")),
      kind: doc.get("kind") === "quick" ? "quick" : "full",
    };
    const createdAt = toIsoString(doc.get("createdAt"));
    if (createdAt) t.createdAt = createdAt;
    return t;
  });
}

/** その週の7日分の気分（手紙の「今週の玉」。AI には渡さない） */
export async function readWeekMoods(db: Firestore, uid: string, weekKey: string): Promise<(MoodId | null)[]> {
  const days = weekDates(weekKey);
  const snap = await db
    .collection(`users/${uid}/moods`)
    .where(FieldPath.documentId(), ">=", days[0])
    .where(FieldPath.documentId(), "<=", days[6])
    .get();
  const byDay = new Map<string, unknown>(snap.docs.map((d) => [d.id, d.get("mood")]));
  return toMoodWeek(days.map((d) => byDay.get(d)));
}

export async function getLetter(db: Firestore, uid: string, weekKey: string): Promise<Letter | null> {
  const snap = await db.doc(`${lettersPath(uid)}/${weekKey}`).get();
  return snap.exists ? toLetter(weekKey, snap.data() ?? {}) : null;
}

/** 生成中のドキュメントの状態（GET /api/letters/current 用）。無ければ null */
export async function getLetterState(
  db: Firestore,
  uid: string,
  weekKey: string
): Promise<{ letter: Letter; startedAt: unknown } | null> {
  const snap = await db.doc(`${lettersPath(uid)}/${weekKey}`).get();
  if (!snap.exists) return null;
  return { letter: toLetter(weekKey, snap.data() ?? {}), startedAt: snap.get("startedAt") };
}

export type BeginResult =
  /** staleUsageDate：止まった生成中を作り直した。前の生成が枠を使った日付（呼び出し側が戻す） */
  | { kind: "started"; genId: string; staleUsageDate?: string }
  | { kind: "generating" }
  | { kind: "ready"; letter: Letter };

/** 生成を始める（トランザクション。同時に2つ始まらない） */
export async function beginLetter(
  db: Firestore,
  uid: string,
  init: { weekKey: string; moods: (MoodId | null)[]; recordDays: number; model: string; usageDate: string },
  nowMs: number = Date.now()
): Promise<BeginResult> {
  const ref = db.doc(`${lettersPath(uid)}/${init.weekKey}`);
  const { from, to } = weekRange(init.weekKey);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const decision = decideBegin(snap.exists ? { status: snap.get("status"), startedAt: snap.get("startedAt") } : null, nowMs);
    if (decision === "ready") return { kind: "ready", letter: toLetter(init.weekKey, snap.data() ?? {}) };
    if (decision === "generating") return { kind: "generating" };
    const stale = snap.exists && snap.get("status") === "generating" ? snap.get("usageDate") : undefined;
    const genId = randomUUID();
    tx.set(ref, {
      weekKey: init.weekKey,
      from,
      to,
      status: "generating",
      blocks: [],
      refs: [],
      moods: init.moods,
      recordDays: init.recordDays,
      model: init.model,
      genId,
      startedAt: nowMs,
      usageDate: init.usageDate,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    });
    return { kind: "started", genId, ...(typeof stale === "string" ? { staleUsageDate: stale } : {}) };
  });
}

/**
 * できた手紙を保存する。自分の genId の生成中ドキュメントがまだあるときだけ書く（途中で手紙が消されたら null）。
 * 引用した記録が途中で消されていたら、その引用を伏せて保存する。model を渡すと上書きする（固定文の手紙）。
 */
export async function saveLetter(
  db: Firestore,
  uid: string,
  weekKey: string,
  genId: string,
  content: { blocks: LetterBlock[]; refs: LetterRef[]; model?: string }
): Promise<Letter | null> {
  const ref = db.doc(`${lettersPath(uid)}/${weekKey}`);
  const thoughtIds = [...new Set(content.refs.map((r) => r.thoughtId))];
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("genId") !== genId || snap.get("status") !== "generating") return null;
    const thoughtSnaps = thoughtIds.length
      ? await tx.getAll(...thoughtIds.map((id) => db.doc(`users/${uid}/thoughts/${id}`)))
      : [];
    const existing = new Set(thoughtSnaps.filter((s) => s.exists).map((s) => s.id));
    const refs = maskMissingRefs(content.refs, existing);
    const model = content.model ?? snap.get("model");
    tx.update(ref, {
      status: "ready",
      blocks: content.blocks,
      refs,
      ...(content.model ? { model: content.model } : {}),
      genId: FieldValue.delete(),
      startedAt: FieldValue.delete(),
      usageDate: FieldValue.delete(),
    });
    return toLetter(weekKey, {
      ...snap.data(),
      status: "ready",
      blocks: content.blocks,
      refs,
      model,
      createdAt: toIsoString(snap.get("createdAt")) ?? new Date().toISOString(),
    });
  });
}

/** 生成に失敗したとき、作りかけ（自分の genId のもの）を消す。別の生成や届いた手紙は消さない */
export async function discardLetter(db: Firestore, uid: string, weekKey: string, genId: string): Promise<void> {
  const ref = db.doc(`${lettersPath(uid)}/${weekKey}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.get("genId") === genId && snap.get("status") === "generating") tx.delete(ref);
  });
}

/** 過去の手紙（届いたものだけ・新しい週が先） */
export async function listLetters(db: Firestore, uid: string): Promise<LetterSummary[]> {
  const snap = await db
    .collection(lettersPath(uid))
    .orderBy(FieldPath.documentId(), "desc")
    .limit(LETTER_LIST_LIMIT)
    .select("from", "to", "status", "recordDays", "readAt", "createdAt")
    .get();
  return snap.docs
    .map((d) => toLetter(d.id, d.data()))
    .filter((l) => l.status === "ready")
    .map(toLetterSummary);
}

/** 既読にする（初めて開いた時刻だけ残す）。届いた手紙が無ければ false */
export async function markLetterRead(db: Firestore, uid: string, weekKey: string): Promise<boolean> {
  const ref = db.doc(`${lettersPath(uid)}/${weekKey}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("status") !== "ready") return false;
    if (!snap.get("readAt")) tx.update(ref, { readAt: FieldValue.serverTimestamp() });
    return true;
  });
}

/** 手紙を消す（完全削除。憲法第13条）。無ければ false */
export async function deleteLetter(db: Firestore, uid: string, weekKey: string): Promise<boolean> {
  const ref = db.doc(`${lettersPath(uid)}/${weekKey}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    tx.delete(ref);
    return true;
  });
}
