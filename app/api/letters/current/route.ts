// 今週の手紙（PLAN 77。契約 §6）。
// GET ：手紙の状態（ready / locked / generating / none）。日曜に開けて翌土曜まで読める（letterWeekFor）
// POST：開いたとき1回だけ生成する（トランザクションで二重生成を防ぐ）。NDJSON（start → delta… → done）
// AI に渡すのは、その週の本人の記録（日付つき・本人の言葉のまま）だけ。気分・メタ・会話・自動の呼び名は渡さない
// （docs/mentor-prompt.md「週の手紙用の追記」・憲法第12条3項）。今週の玉は手紙のドキュメントに表示用として保存するだけ。
// システムプロンプトは buildSystemPrompt("letter", profile) をそのまま使う（文面をここで書かない）。
import { NextRequest, NextResponse } from "next/server";
import type { ApiErrorCode, CurrentLetterResponse, LetterStreamEvent } from "@/lib/api/contracts";
import { ndjsonResponse } from "@/lib/api/ndjson";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import {
  buildLetterEntries,
  countRecordDays,
  createQuoteLineFilter,
  formatLetterInput,
  isUsableLetter,
  LETTER_MAX_TOKENS,
  parseLetterOutput,
} from "@/lib/ai/letter";
import { buildSystemPrompt } from "@/lib/ai/mentorPrompt";
import { joinTextBlocks } from "@/lib/ai/text";
import { adminDb, verifyUser, verifyUserInfo } from "@/lib/db/admin";
import {
  beginLetter,
  decideBegin,
  discardLetter,
  getLetterState,
  readWeekMoods,
  readWeekThoughts,
  saveLetter,
} from "@/lib/db/letterStore";
import { consumeQuota } from "@/lib/db/usage";
import { tokyoDateKey } from "@/lib/logic/date";
import { hasEnoughForLetter, isLetterOpenable } from "@/lib/logic/letterKey";
import { letterLimitFor, MIN_THOUGHTS_FOR_LETTER } from "@/lib/logic/limits";
import { letterWeekFor, weekRange } from "@/lib/logic/week";

export const maxDuration = 300;

/** 手紙のモデル（2026-10-24 承認 A①：相談と同じ Opus 4.8・adaptive thinking・effort high） */
const LETTER_MODEL = MODELS.letter;

function err(error: ApiErrorCode, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function currentWeek() {
  const today = tokyoDateKey(new Date());
  const weekKey = letterWeekFor(today);
  return { today, weekKey, ...weekRange(weekKey) };
}

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return err("unauthorized", 401);

  const { weekKey, from, to } = currentWeek();
  const base = { weekKey, from, to, needed: MIN_THOUGHTS_FOR_LETTER };
  const state = await getLetterState(adminDb, uid, weekKey);
  if (state) {
    const decision = decideBegin({ status: state.letter.status, startedAt: state.startedAt }, Date.now());
    if (decision === "ready") {
      const body: CurrentLetterResponse = { ...base, status: "ready", recordDays: state.letter.recordDays, letter: state.letter };
      return NextResponse.json(body);
    }
    if (decision === "generating") {
      const body: CurrentLetterResponse = { ...base, status: "generating", recordDays: state.letter.recordDays };
      return NextResponse.json(body);
    }
  }
  const recordDays = countRecordDays(await readWeekThoughts(adminDb, uid, weekKey));
  const body: CurrentLetterResponse = {
    ...base,
    status: hasEnoughForLetter(recordDays) ? "none" : "locked",
    recordDays,
  };
  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return err("unauthorized", 401);
  const { uid, isGuest } = authInfo;

  const { today, weekKey } = currentWeek();
  if (!isLetterOpenable(weekKey, today)) return err("not_available", 409);

  let thoughts;
  let moods;
  let profile;
  try {
    const [t, m, userSnap] = await Promise.all([
      readWeekThoughts(adminDb, uid, weekKey),
      readWeekMoods(adminDb, uid, weekKey),
      adminDb.doc(`users/${uid}`).get(),
    ]);
    thoughts = t;
    moods = m;
    profile = userSnap.get("profile") ?? null;
  } catch (e) {
    console.error("letter prepare failed:", e);
    return err("ai_failed", 502);
  }

  const recordDays = countRecordDays(thoughts);
  const entries = buildLetterEntries(thoughts);
  // 記録が少ない週は書かない（AI を呼ばない）。本文のある記録が1つも無い週も同じ扱い
  if (!hasEnoughForLetter(recordDays) || entries.length === 0) {
    return err("too_few_records", 409, { recordDays, needed: MIN_THOUGHTS_FOR_LETTER });
  }

  const quota = await consumeQuota(uid, "letter", letterLimitFor(isGuest));
  if (!quota) return err("daily_limit", 429);

  let begun;
  try {
    begun = await beginLetter(adminDb, uid, { weekKey, moods, recordDays, model: LETTER_MODEL });
  } catch (e) {
    console.error("letter begin failed:", e);
    await quota.refund();
    return err("ai_failed", 502);
  }
  if (begun.kind === "generating") {
    await quota.refund();
    return err("already_generating", 409);
  }
  if (begun.kind === "ready") {
    // もう届いている（別のタブが先に作った）：作り直さずにそのまま返す
    await quota.refund();
    const letter = begun.letter;
    return ndjsonResponse(async (push) => {
      push({ type: "start", weekKey } satisfies LetterStreamEvent);
      push({ type: "done", letter } satisfies LetterStreamEvent);
    });
  }
  const { genId } = begun;

  const system = buildSystemPrompt("letter", profile);
  const input = formatLetterInput(weekKey, recordDays, entries);
  const thoughtMap = new Map(thoughts.map((t) => [t.id, t]));

  return ndjsonResponse(async (rawPush) => {
    // 画面が閉じられても生成は最後まで続けて保存する（次に開いたときに届いている）。送れない行は捨てる
    let clientGone = false;
    const push = (ev: LetterStreamEvent) => {
      if (clientGone) return;
      try {
        rawPush(ev);
      } catch {
        clientGone = true;
      }
    };
    let saved = false;
    const t0 = Date.now();
    let firstTokenAt: number | null = null;
    const fail = async (error: ApiErrorCode) => {
      await discardLetter(adminDb, uid, weekKey, genId).catch((e) => console.error("letter discard failed:", e));
      await quota.refund();
      push({ type: "error", error });
    };
    try {
      push({ type: "start", weekKey });
      const filter = createQuoteLineFilter();
      const stream = anthropic.messages.stream({
        model: LETTER_MODEL,
        max_tokens: LETTER_MAX_TOKENS,
        // Opus 4.8 は省略すると thinking オフになるため明示する
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        // 固定の system を先頭（キャッシュの構造を崩さない）、週の記録は末尾
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: input }],
      });
      // 検証前の引用の行は流さない（本文の段落だけ）。引用は done の手紙で、検証を通ったものだけ出す
      stream.on("text", (delta) => {
        if (firstTokenAt === null) firstTokenAt = Date.now();
        const out = filter.push(delta);
        if (out) push({ type: "delta", text: out });
      });
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal" || final.stop_reason === "max_tokens") {
        console.warn(`[letter] incomplete stop_reason=${final.stop_reason}`);
        await fail("incomplete_response");
        return;
      }
      const tail = filter.flush();
      if (tail) push({ type: "delta", text: tail });

      const parsed = parseLetterOutput(joinTextBlocks(final.content), entries, thoughtMap);
      if (!isUsableLetter(parsed.blocks)) {
        await fail("incomplete_response");
        return;
      }
      const letter = await saveLetter(adminDb, uid, weekKey, genId, { blocks: parsed.blocks, refs: parsed.refs });
      if (!letter) {
        // 生成の途中で手紙が消された：保存しない
        await quota.refund();
        push({ type: "error", error: "not_found" });
        return;
      }
      saved = true;
      const firstMs = firstTokenAt === null ? -1 : firstTokenAt - t0;
      console.info(
        `[letter] entries=${entries.length} refs=${parsed.refs.length} dropped_quotes=${parsed.droppedQuotes} first_token=${firstMs}ms total=${Date.now() - t0}ms`
      );
      push({ type: "done", letter });
    } catch (e) {
      console.error("letter failed:", e);
      // 保存済みなら手紙は届いている（次に開けば読める）。枠も返さない
      if (!saved) await fail("ai_failed");
    }
  });
}
