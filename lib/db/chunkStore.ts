// 検索用メタ（PLAN 57）を記録のチャンクに付けて embedding を作り直す（サーバー専用）。
// 保存・編集の API が after() で裏から呼ぶ。ユーザーを待たせず、失敗しても保存は成功のまま
// （チャンクはメタなしの embedding で検索できる）。チャンクの text（本人の言葉）は一切書き換えない。

import { FieldValue } from "firebase-admin/firestore";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import { embedTexts } from "@/lib/ai/embedding";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import {
  generateMeta,
  META_MAX_TOKENS,
  metaLimitFor,
  type MetaCaller,
  type MetaSource,
} from "@/lib/ai/meta";
import { joinTextBlocks } from "@/lib/ai/text";
import { adminDb } from "@/lib/db/admin";
import { chunkCollectionPath } from "@/lib/db/chunks";
import { consumeQuota } from "@/lib/db/usage";
import { embeddingInput } from "@/lib/logic/recordText";

/** Haiku 4.5 を1回呼ぶ。固定のシステムプロンプトを先に、可変の記録は messages の末尾に置く */
const callHaiku: MetaCaller = async (system, userContent) => {
  const res = await anthropic.messages.create({
    model: MODELS.meta,
    max_tokens: META_MAX_TOKENS,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
  });
  return { stopReason: res.stop_reason, text: joinTextBlocks(res.content) };
};

export type MetaJobResult =
  | "ok"
  | "skipped_not_full"
  | "skipped_gone"
  | "skipped_quota"
  | "skipped_stale"
  | "failed_generate"
  | "failed_embed";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toSource(data: FirebaseFirestore.DocumentData): MetaSource {
  return {
    date: str(data.date),
    rawText: str(data.rawText),
    deepDiveQuestion: str(data.deepDiveQuestion),
    deepDiveAnswer: str(data.deepDiveAnswer),
  };
}

function sameSource(a: MetaSource, b: MetaSource): boolean {
  return (
    a.date === b.date &&
    a.rawText === b.rawText &&
    a.deepDiveQuestion === b.deepDiveQuestion &&
    a.deepDiveAnswer === b.deepDiveAnswer
  );
}

/** 本人の文章はログに出さない。thoughtId と理由だけ残す */
function logFailure(level: "warn" | "error", thoughtId: string, reason: string, extra?: Record<string, unknown>) {
  console[level]("[meta]", { thoughtId, reason, ...extra });
}

async function embedWithRetry(texts: string[]): Promise<number[][]> {
  try {
    return await embedTexts(texts);
  } catch {
    return embedTexts(texts); // 再試行は1回まで
  }
}

/**
 * full の記録のメタを作り、その記録の全チャンクに同じメタを付けて embedding を作り直す。
 * - quick は対象外（保存時に moodMetaLine を付けている。AI を呼ばない）
 * - 日次の利用枠（usage の meta）を1つ使う。AI が一度も応答しなかったときは返す
 * - 書く直前に、記録の本文とチャンクの text が読んだときと同じか確かめる（裏の処理の間に編集されたら書かない。
 *   その編集の after() が新しいメタを作る）
 * - 例外は投げない（呼び出し側は after() の中。保存の成否に関わらない）
 */
export async function refreshThoughtMeta(uid: string, thoughtId: string, isGuest: boolean): Promise<MetaJobResult> {
  try {
    const thoughtRef = adminDb.doc(`users/${uid}/thoughts/${thoughtId}`);
    const snap = await thoughtRef.get();
    if (!snap.exists) return "skipped_gone";
    const data = snap.data() ?? {};
    if (data.kind !== "full") return "skipped_not_full";
    const src = toSource(data);

    const quota = await consumeQuota(uid, "meta", metaLimitFor(isGuest));
    if (!quota) {
      logFailure("warn", thoughtId, "daily_limit");
      return "skipped_quota";
    }

    const outcome = await generateMeta(buildSystemPrompt("meta", null), src, callHaiku);
    if (!outcome.ok) {
      if (!outcome.called) await quota.refund();
      logFailure("error", thoughtId, outcome.reason, { attempts: outcome.attempts });
      return "failed_generate";
    }
    const meta = outcome.meta;

    const col = adminDb.collection(chunkCollectionPath(uid));
    const chunkSnap = await col.where("thoughtId", "==", thoughtId).get();
    if (chunkSnap.empty) return "skipped_gone";
    const planned = chunkSnap.docs.map((d) => ({ id: d.id, text: str(d.get("text")) }));

    let vectors: number[][];
    try {
      vectors = await embedWithRetry(planned.map((c) => embeddingInput(c.text, meta)));
      if (vectors.length !== planned.length) throw new Error("embedding count mismatch");
    } catch (e) {
      logFailure("error", thoughtId, "embed", { message: e instanceof Error ? e.message : String(e) });
      return "failed_embed";
    }

    const written = await adminDb.runTransaction(async (tx) => {
      const [fresh, freshChunks] = await Promise.all([
        tx.get(thoughtRef),
        tx.get(col.where("thoughtId", "==", thoughtId)),
      ]);
      if (!fresh.exists || !sameSource(toSource(fresh.data() ?? {}), src)) return false;
      const now = new Map(freshChunks.docs.map((d) => [d.id, str(d.get("text"))]));
      if (now.size !== planned.length || planned.some((c) => now.get(c.id) !== c.text)) return false;
      planned.forEach((c, i) => {
        tx.update(col.doc(c.id), { meta, embedding: FieldValue.vector(vectors[i]) });
      });
      return true;
    });
    if (!written) {
      logFailure("warn", thoughtId, "stale");
      return "skipped_stale";
    }
    return "ok";
  } catch (e) {
    logFailure("error", thoughtId, "unexpected", { message: e instanceof Error ? e.message : String(e) });
    return "failed_generate";
  }
}
