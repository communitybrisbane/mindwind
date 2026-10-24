// 今週の手紙（PLAN 77。契約 §6）。
// GET ：手紙の状態（ready / locked / generating / none）。日曜に開けて翌土曜まで読める（letterWeekFor）
// POST：開いたとき1回だけ生成を始める（トランザクションで二重生成を防ぐ）。
//       生成そのものは after() で裏で最後まで続けて保存する（画面を閉じても・切断しても止まらない）。
//       応答は GET と同じ形：200 ready（もう届いていた）／202 generating（始めた・別タブが生成中）。画面は GET で受け取る
// AI に渡すのは、その週の本人の記録（日付つき・本人の言葉のまま）だけ。気分・メタ・会話・自動の呼び名は渡さない
// （docs/mentor-prompt.md「週の手紙用の追記」・憲法第12条3項）。今週の玉は手紙のドキュメントに表示用として保存するだけ。
// システムプロンプトは buildSystemPrompt("letter", profile) をそのまま使う（文面をここで書かない）。
// セーフティ（憲法第8条）：その週の記録に危機の言葉があれば、引用を落とし窓口の案内を保証する（lib/ai/letter.ts）。
// その週に AI の手紙が使えなければ（refusal・max_tokens・失敗）、エラーではなく固定文の手紙（窓口の案内）を届ける。
import { after, NextRequest, NextResponse } from "next/server";
import type { ApiErrorCode, CurrentLetterResponse } from "@/lib/api/contracts";
import { anthropic, MODELS } from "@/lib/ai/anthropic";
import {
  applyLetterSafety,
  buildLetterEntries,
  countRecordDays,
  CRISIS_FALLBACK_MODEL,
  crisisLetterBlocks,
  detectCrisisWeek,
  formatLetterInput,
  isUsableLetter,
  LETTER_MAX_TOKENS,
  parseLetterOutput,
  type LetterEntry,
  type LetterThought,
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
import type { Letter, Profile } from "@/lib/db/types";
import { consumeQuota, refundQuota } from "@/lib/db/usage";
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

type Base = Pick<CurrentLetterResponse, "weekKey" | "from" | "to" | "needed">;

function ready(base: Base, letter: Letter) {
  const body: CurrentLetterResponse = { ...base, status: "ready", recordDays: letter.recordDays, letter };
  return NextResponse.json(body);
}

function generating(base: Base, recordDays: number, status = 202) {
  const body: CurrentLetterResponse = { ...base, status: "generating", recordDays };
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return err("unauthorized", 401);

  const { weekKey, from, to } = currentWeek();
  const base: Base = { weekKey, from, to, needed: MIN_THOUGHTS_FOR_LETTER };
  const state = await getLetterState(adminDb, uid, weekKey);
  if (state) {
    const decision = decideBegin({ status: state.letter.status, startedAt: state.startedAt }, Date.now());
    if (decision === "ready") return ready(base, state.letter);
    if (decision === "generating") return generating(base, state.letter.recordDays, 200);
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

  const { today, weekKey, from, to } = currentWeek();
  if (!isLetterOpenable(weekKey, today)) return err("not_available", 409);
  const base: Base = { weekKey, from, to, needed: MIN_THOUGHTS_FOR_LETTER };

  let thoughts: LetterThought[];
  let moods;
  let profile: Profile | null;
  try {
    // 先に状態を見る（枠を使わない）：届いていればそのまま、生成中なら待ってもらう。確定はあとの beginLetter（トランザクション）
    const state = await getLetterState(adminDb, uid, weekKey);
    if (state) {
      const decision = decideBegin({ status: state.letter.status, startedAt: state.startedAt }, Date.now());
      if (decision === "ready") return ready(base, state.letter);
      if (decision === "generating") return generating(base, state.letter.recordDays);
    }
    const [t, m, userSnap] = await Promise.all([
      readWeekThoughts(adminDb, uid, weekKey),
      readWeekMoods(adminDb, uid, weekKey),
      adminDb.doc(`users/${uid}`).get(),
    ]);
    thoughts = t;
    moods = m;
    profile = (userSnap.get("profile") as Profile | undefined) ?? null;
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
    begun = await beginLetter(adminDb, uid, { weekKey, moods, recordDays, model: LETTER_MODEL, usageDate: quota.dateKey });
  } catch (e) {
    console.error("letter begin failed:", e);
    await quota.refund();
    return err("ai_failed", 502);
  }
  if (begun.kind === "generating") {
    await quota.refund();
    return generating(base, recordDays);
  }
  if (begun.kind === "ready") {
    // もう届いている（別のタブが先に作った）：作り直さずにそのまま返す
    await quota.refund();
    return ready(base, begun.letter);
  }
  // 止まった生成を作り直した：前の生成が使った枠を戻す（この生成の枠だけを数える）
  if (begun.staleUsageDate) await refundQuota(uid, "letter", begun.staleUsageDate);

  const job = { uid, weekKey, genId: begun.genId, entries, thoughts, profile, refund: quota.refund };
  // 応答を返したあとも生成は最後まで続く（Vercel の after()。maxDuration の中で終える）
  after(() => generateLetter(job));
  return generating(base, recordDays);
}

type LetterJob = {
  uid: string;
  weekKey: string;
  genId: string;
  entries: LetterEntry[];
  thoughts: LetterThought[];
  profile: Profile | null;
  refund: () => Promise<void>;
};

/**
 * 手紙を生成して保存する（after() の中。例外を外に出さない）。
 * 失敗したら作りかけを消して枠を返す（次に開いたときにもう一度）。ただし危機の週は、エラーのまま放置せず
 * 固定文の手紙（窓口の案内）を保存する（憲法第8条：この週こそ案内が要る）。
 */
async function generateLetter({ uid, weekKey, genId, entries, thoughts, profile, refund }: LetterJob): Promise<void> {
  const crisisWeek = detectCrisisWeek(entries);
  const thoughtMap = new Map(thoughts.map((t) => [t.id, t]));
  const t0 = Date.now();

  const fail = async (reason: string) => {
    if (crisisWeek) {
      const letter = await saveLetter(adminDb, uid, weekKey, genId, {
        blocks: crisisLetterBlocks(),
        refs: [],
        model: CRISIS_FALLBACK_MODEL,
      }).catch((e) => {
        console.error("letter fallback save failed:", e);
        return null;
      });
      if (letter) {
        console.warn(`[letter] ${reason}: crisis week, saved fixed-text letter total=${Date.now() - t0}ms`);
        return;
      }
    }
    await discardLetter(adminDb, uid, weekKey, genId).catch((e) => console.error("letter discard failed:", e));
    await refund();
    console.warn(`[letter] ${reason}: discarded total=${Date.now() - t0}ms`);
  };

  try {
    const system = buildSystemPrompt("letter", profile);
    const input = formatLetterInput(weekKey, countRecordDays(thoughts), entries);
    // 長い生成なのでストリームで受け、最後のメッセージだけ使う（途中の文は画面に流さない：検証前の文を見せない）
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
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal" || final.stop_reason === "max_tokens") {
      await fail(`incomplete stop_reason=${final.stop_reason}`);
      return;
    }

    const parsed = parseLetterOutput(joinTextBlocks(final.content), entries, thoughtMap);
    const safe = applyLetterSafety(parsed, crisisWeek);
    if (!isUsableLetter(safe.blocks)) {
      await fail("unusable letter");
      return;
    }
    const letter = await saveLetter(adminDb, uid, weekKey, genId, { blocks: safe.blocks, refs: safe.refs });
    if (!letter) {
      // 生成の途中で手紙が消された：保存しない（枠は返す）
      await refund();
      console.warn("[letter] letter document vanished during generation");
      return;
    }
    console.info(
      `[letter] entries=${entries.length} refs=${safe.refs.length} dropped_quotes=${parsed.droppedQuotes} dropped_paragraphs=${parsed.droppedParagraphs} crisis_week=${crisisWeek} quotes_removed=${safe.quotesRemoved} hotline_added=${safe.hotlineAdded} total=${Date.now() - t0}ms`
    );
  } catch (e) {
    console.error("letter failed:", e);
    await fail("exception");
  }
}
