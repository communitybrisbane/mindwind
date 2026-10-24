// 検索用メタの生成（PLAN 57。承認済み：docs/mentor-prompt.md「検索用メタの生成用の追記」）。サーバー側専用。
// full の記録ごとに1行のメモ（出来事・感情・場面）を Haiku 4.5 に作らせ、その記録の全チャンクに同じものを付ける。
// メモは embedding の入力にだけ足す（`${text}\n${meta}`）。画面にも、相談・手紙の AI にも出さない。
// 入力は本人の言葉（本文・深掘りの Q と A）と日付だけ。profile は渡さない（buildSystemPrompt("meta") が省く）。
// 失敗してもチャンクだけで検索できる（メモなしの embedding のまま）ので、保存の成否には関わらない。

import { guestLimit, MEMBER_LIMITS } from "@/lib/logic/limits";

/** モデルは lib/ai/anthropic.ts の MODELS.meta（Haiku 4.5・thinking なし）。ここは純粋ロジックなので SDK を読み込まない */
export const META_MAX_TOKENS = 200;

/**
 * メタ生成の日次上限（回/日）。保存に加えて編集でも作り直すので、記録上限の3倍（深掘りと同じ考え方）。
 * ゲストは会員の 1/10。limits.ts には足さず、ここで記録上限から決める。
 */
export const META_PER_DAY_FACTOR = 3;
export function metaLimitFor(isGuest: boolean): number {
  const member = MEMBER_LIMITS.recordPerDay * META_PER_DAY_FACTOR;
  return isGuest ? guestLimit(member) : member;
}

/** 文字数の上限（指示は60字以内。「大きく超える」ものだけ捨てる） */
export const META_MAX_CHARS = 80;

export type MetaSource = {
  date: string; // YYYY-MM-DD（Asia/Tokyo の記録日）
  rawText: string;
  deepDiveQuestion: string;
  deepDiveAnswer: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-20" → "2026-10-20（火）"。日付キーは暦日なので UTC で曜日を出す */
export function dateWithWeekday(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return `${date}（${WEEKDAYS[day]}）`;
}

/**
 * AI に渡す入力（messages の末尾・user）。docs/drafts/mentor-prompt-v5-drafts.md §1 の形。
 * 本人の文章は書き換えずにそのまま入れる。深掘りの答えが無ければ Q/A の行ごと省く。質問が無ければ Q の行だけ省く。
 */
export function buildMetaInput(src: MetaSource): string {
  const lines = [`【記録】${dateWithWeekday(src.date)}`, "本文：", src.rawText];
  if (src.deepDiveAnswer.trim()) {
    lines.push("");
    if (src.deepDiveQuestion.trim()) lines.push(`Q（メンターの質問）：${src.deepDiveQuestion}`);
    lines.push(`A（本人の答え）：${src.deepDiveAnswer}`);
  }
  return lines.join("\n");
}

const META_SHAPE = /^出来事：.+／感情：.+／場面：.+$/;
// 窓口の案内（共通部のセーフティ）が返ってきたときに、メモとして混ぜないための守り
const PHONE_LIKE = /\d{2,5}[-‐－ー]\d{2,5}[-‐－ー]\d{3,5}|\d{10,}/;
const HOTLINE_WORDS = /いのちの電話|よりそいホットライン/;

/** 出力の検査。合格ならそのまま（前後の空白だけ除く）返し、不合格なら null（捨てる） */
export function validateMeta(output: string): string | null {
  const s = output.trim();
  if (!s || /[\r\n]/.test(s)) return null;
  if ([...s].length > META_MAX_CHARS) return null;
  if (!META_SHAPE.test(s)) return null;
  if (PHONE_LIKE.test(s.normalize("NFKC")) || HOTLINE_WORDS.test(s)) return null;
  return s;
}

/** AI 呼び出し1回分の結果（テストで差し替えられるように SDK の形から切り離す） */
export type MetaCallResult = { stopReason: string | null; text: string };
export type MetaCaller = (system: string, userContent: string) => Promise<MetaCallResult>;

export type MetaOutcome =
  | { ok: true; meta: string; attempts: number }
  | { ok: false; reason: "refusal" | "incomplete" | "invalid" | "error"; attempts: number; called: boolean };

/** 最大試行回数（初回＋再試行1回） */
export const META_MAX_ATTEMPTS = 2;

/**
 * メタを作る（再試行は1回まで）。refusal は再試行しない（同じ入力では同じ結果になるため）。
 * called は AI が一度でも応答を返したか（利用枠を返すかの判断に使う）。
 */
export async function generateMeta(system: string, src: MetaSource, call: MetaCaller): Promise<MetaOutcome> {
  const input = buildMetaInput(src);
  let last: MetaOutcome = { ok: false, reason: "error", attempts: 0, called: false };
  let called = false;
  for (let attempt = 1; attempt <= META_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await call(system, input);
      called = true;
      if (res.stopReason === "refusal") return { ok: false, reason: "refusal", attempts: attempt, called };
      if (res.stopReason !== "end_turn") {
        last = { ok: false, reason: "incomplete", attempts: attempt, called };
        continue;
      }
      const meta = validateMeta(res.text);
      if (meta) return { ok: true, meta, attempts: attempt };
      last = { ok: false, reason: "invalid", attempts: attempt, called };
    } catch {
      last = { ok: false, reason: "error", attempts: attempt, called };
    }
  }
  return last;
}
