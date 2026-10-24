// 週の手紙（PLAN 77）の純粋ロジック。AI の呼び出しそのものは app/api/letters/current/route.ts。
// - 入力：その週の本人の記録だけ（日付つき・本人の言葉のまま）。メタ・気分・会話・自動の呼び名・題は渡さない
//   （docs/mentor-prompt.md「週の手紙用の追記」・憲法第12条3項。形は docs/drafts/mentor-prompt-v5-drafts.md §3）
// - 出力：ふつうの段落と「>> ［n］引用」の行。引用は番号 n の記録の rawText か deepDiveAnswer の
//   部分文字列そのもの（空白の正規化なし）だけを残し、違うもの・番号が無いもの・範囲外は落とす（本人の言葉でない文を本人の言葉として出さない）。
//   本文の段落の中の「」『』も同じで、その週の記録に無い言葉を囲んだ段落は落とす。
// - セーフティ（憲法第8条）：その週の記録に危機の言葉（lib/logic/crisis.ts）があれば、プロンプト任せにせず
//   コードでも引用を全部落とし、窓口の案内が無ければ固定文を足す。AI の手紙が使えないときは固定文だけの手紙にする。
// システムプロンプトの文面はここに書かない（lib/ai/mentorPrompt.ts の buildSystemPrompt("letter", …) をそのまま使う）。
import type { LetterBlock, LetterRef, Thought } from "@/lib/db/types";
import { splitIntoChunks } from "@/lib/logic/chunk";
import { CRISIS_LETTER_PARAGRAPHS, detectCrisis, hasHotlineGuidance } from "@/lib/logic/crisis";
import { dateWithWeekday } from "@/lib/logic/ragChunks";
import { weekRange } from "@/lib/logic/week";

/** AI に渡す記録の合計の上限（字。チャンクの境界で切る）。下書き §3「実装への注意」の目安 */
export const MAX_LETTER_INPUT_CHARS = 12_000;

/** 生成の出力上限（adaptive thinking の考える分を含む） */
export const LETTER_MAX_TOKENS = 16_000;

/** 引用として残す最短の長さ（記号1字だけの「引用」を落とす） */
const MIN_QUOTE_LENGTH = 2;

/** 本文の「」『』の中身を検証する最短の長さ（これより短い囲みは言葉の強調とみなして見ない） */
export const MIN_BODY_QUOTE_LENGTH = 4;

/** 危機の週の固定文（AI の手紙が使えないときの手紙。文言は lib/logic/crisis.ts） */
export const CRISIS_FALLBACK_MODEL = "fixed-text";

/** 手紙の材料にする記録（Thought のうち使う項目だけ） */
export type LetterThought = Pick<Thought, "id" | "date" | "rawText" | "deepDiveQuestion" | "deepDiveAnswer" | "kind" | "createdAt">;

/** AI に渡す1件（チャンク単位）。n は ［n］ の番号（1 始まり） */
export type LetterEntry = {
  n: number;
  thoughtId: string;
  date: string;
  source: "diary" | "deepdive";
  /** diary：本文のチャンクそのまま／deepdive：本人の答え（deepDiveAnswer そのまま） */
  text: string;
  /** deepdive のときだけ。メンターの質問（引用はしない） */
  question?: string;
};

type Piece = Omit<LetterEntry, "n"> & { createdAt: string; order: number };

function piecesOf(t: LetterThought): Piece[] {
  return splitIntoChunks(t).map((p) => {
    const base = { thoughtId: t.id, date: t.date, createdAt: t.createdAt ?? "", order: p.order };
    if (p.source === "deepdive") {
      const q = t.deepDiveQuestion.trim();
      return { ...base, source: "deepdive" as const, text: t.deepDiveAnswer, ...(q ? { question: q } : {}) };
    }
    return { ...base, source: "diary" as const, text: p.text };
  });
}

function pieceSize(p: Piece): number {
  return p.text.length + (p.question?.length ?? 0);
}

/**
 * その週の記録を、AI に渡す番号つきの一覧にする。
 * 合計が maxChars を超える週は、日ごとに新しい記録から順に（日をまたいで1チャンクずつ交互に）入れ、入らないチャンクで切る。
 * 並びは日付順・同じ日は書いた順・同じ記録はチャンクの順。
 */
export function buildLetterEntries(thoughts: LetterThought[], maxChars: number = MAX_LETTER_INPUT_CHARS): LetterEntry[] {
  const byDay = new Map<string, Piece[]>();
  const newestFirst = [...thoughts].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  for (const t of newestFirst) {
    const list = byDay.get(t.date) ?? [];
    list.push(...piecesOf(t));
    byDay.set(t.date, list);
  }
  const queues = [...byDay.keys()].sort().map((d) => byDay.get(d) ?? []);
  const picked: Piece[] = [];
  let used = 0;
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const q of queues) {
      const next = q[0];
      if (!next) continue;
      const size = pieceSize(next);
      if (used + size > maxChars) {
        q.length = 0; // この日はここで切る（チャンクの境界）
        continue;
      }
      q.shift();
      picked.push(next);
      used += size;
      progressed = true;
    }
  }
  picked.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.thoughtId.localeCompare(b.thoughtId) ||
      a.order - b.order
  );
  return picked.map(({ thoughtId, date, source, text, question }, i) => ({
    n: i + 1,
    thoughtId,
    date,
    source,
    text,
    ...(question ? { question } : {}),
  }));
}

/** その週に記録（thoughts）があった日数。玉だけの日は数えない */
export function countRecordDays(thoughts: Pick<Thought, "date">[]): number {
  return new Set(thoughts.map((t) => t.date).filter(Boolean)).size;
}

/**
 * 危機の週か：AI に渡す記録（本人の言葉だけ。Q は見ない）のどれかに危機の言葉があるとき true。
 * プロンプトの「深刻な内容があれば引用せず窓口を案内する」をコード側でも保証するための入口（憲法第8条）。
 */
export function detectCrisisWeek(entries: Pick<LetterEntry, "text">[]): boolean {
  return entries.some((e) => detectCrisis(e.text));
}

/** messages の末尾（user）に置く入力。下書き §3「AI に渡す入力」の形 */
export function formatLetterInput(weekKey: string, recordDays: number, entries: LetterEntry[]): string {
  const { from, to } = weekRange(weekKey);
  const body = entries
    .map((e) => {
      const head = `［${e.n}］${dateWithWeekday(e.date)}`;
      if (e.source === "deepdive") {
        const q = e.question ? `Q（メンターの質問）：${e.question}\n` : "";
        return `${head}深掘り\n${q}A（本人の答え）：${e.text}`;
      }
      return `${head}本文\n${e.text}`;
    })
    .join("\n\n");
  return [
    `【今週】${dateWithWeekday(from)}〜${dateWithWeekday(to)}`,
    `【記録した日数】${recordDays}日`,
    "",
    "【今週の記録（本人の言葉・日付順）】",
    body,
  ].join("\n");
}

/* ---------- 出力の読み取りと引用の検証 ---------- */

const QUOTE_LINE = /^>>\s*[［[]\s*(\d+)\s*[］\]]\s*(.*)$/;

/** 引用の候補（AI が「」で囲んでしまった場合は中身も試す。中身が一字も違わないときだけ通る） */
function quoteCandidates(raw: string): string[] {
  const q = raw.trim();
  const out = [q];
  const m = /^[「『](.+)[」』]$/.exec(q);
  if (m) out.push(m[1]);
  return out;
}

/**
 * 引用が番号 n の記録の本人の言葉（rawText か deepDiveAnswer）の部分文字列そのものなら、その文字列を返す。
 * Q（メンターの質問）だけにある文は通らない。
 */
export function verifyQuote(quote: string, thought: Pick<Thought, "rawText" | "deepDiveAnswer"> | undefined): string | null {
  if (!thought) return null;
  for (const c of quoteCandidates(quote)) {
    if (c.length < MIN_QUOTE_LENGTH) continue;
    if (thought.rawText.includes(c) || thought.deepDiveAnswer.includes(c)) return c;
  }
  return null;
}

export type ParsedLetter = {
  blocks: LetterBlock[];
  refs: LetterRef[];
  /** 検証に通らず落とした「>> 」の引用の数 */
  droppedQuotes: number;
  /** 記録に無い言葉を「」『』で囲んでいたため落とした本文の段落の数 */
  droppedParagraphs: number;
};

const BODY_QUOTE = /[「『]([^「」『』]+)[」』]/g;

/**
 * 本文の段落の「」『』の中身が、その週の記録（rawText か deepDiveAnswer）のどれかにそのまま含まれるか。
 * 短い囲み（MIN_BODY_QUOTE_LENGTH 未満）は強調とみなして見ない。囲みが無ければ true。
 */
export function verifyBodyQuotes(
  paragraph: string,
  thoughts: Iterable<Pick<Thought, "rawText" | "deepDiveAnswer">>
): boolean {
  const fragments = [...paragraph.matchAll(BODY_QUOTE)].map((m) => m[1].trim()).filter((f) => f.length >= MIN_BODY_QUOTE_LENGTH);
  if (fragments.length === 0) return true;
  const sources = [...thoughts];
  return fragments.every((f) => sources.some((t) => t.rawText.includes(f) || t.deepDiveAnswer.includes(f)));
}

/**
 * AI の出力を便箋のブロックにする。段落は空行で区切る。「>> ［n］…」の行は検証を通ったものだけ quote ブロックにする。
 * 本文の文はそのまま使う（書き換えない）が、記録に無い言葉を「」『』で囲んだ段落は丸ごと落とす（言い換えを本人の言葉として出さない）。
 * 同じ記録の同じ引用は refs を使い回す。
 */
export function parseLetterOutput(
  text: string,
  entries: LetterEntry[],
  thoughts: Map<string, Pick<Thought, "rawText" | "deepDiveAnswer">>
): ParsedLetter {
  const byN = new Map(entries.map((e) => [e.n, e]));
  const blocks: LetterBlock[] = [];
  const refs: LetterRef[] = [];
  let dropped = 0;
  let droppedParagraphs = 0;
  let para: string[] = [];
  const flush = () => {
    const t = para.join("\n").trim();
    para = [];
    if (!t) return;
    if (!verifyBodyQuotes(t, thoughts.values())) {
      droppedParagraphs += 1;
      return;
    }
    blocks.push({ type: "text", text: t });
  };
  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trimStart().startsWith(">>")) {
      flush();
      const m = QUOTE_LINE.exec(line.trimStart());
      const entry = m ? byN.get(Number(m[1])) : undefined;
      const quote = m && entry ? verifyQuote(m[2], thoughts.get(entry.thoughtId)) : null;
      if (!entry || quote === null) {
        dropped += 1;
        continue;
      }
      let ref = refs.findIndex((r) => r.thoughtId === entry.thoughtId && r.quote === quote);
      if (ref < 0) {
        refs.push({ thoughtId: entry.thoughtId, date: entry.date, quote });
        ref = refs.length - 1;
      }
      blocks.push({ type: "quote", ref });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return { blocks, refs, droppedQuotes: dropped, droppedParagraphs };
}

/** 本文の段落が1つも無い（空の手紙・引用だけ）なら使えない */
export function isUsableLetter(blocks: LetterBlock[]): boolean {
  return blocks.some((b) => b.type === "text" && b.text.length > 0);
}

/* ---------- セーフティ（憲法第8条） ---------- */

export type SafeLetter = {
  blocks: LetterBlock[];
  refs: LetterRef[];
  /** 引用を落とした（危機の週、または AI が窓口を案内していた） */
  quotesRemoved: boolean;
  /** 窓口の案内が無かったので固定文を足した */
  hotlineAdded: boolean;
};

function textOf(blocks: LetterBlock[]): string {
  return blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n");
}

/**
 * 手紙の安全を、プロンプト任せにせずコードで確かめる。
 * - 危機の週（入力に危機の言葉）か、AI 自身が窓口を案内した手紙（＝AI が深刻と判断した）なら、引用を全部落とす
 *   （つらい記録の言葉を切れ端にして並べない。プロンプト「引用もしない」の保証）
 * - 危機の週なのに窓口の案内（両方の番号）が無ければ、固定文の段落を末尾に足す
 * それ以外の週はそのまま返す。
 */
export function applyLetterSafety(parsed: Pick<ParsedLetter, "blocks" | "refs">, crisisWeek: boolean): SafeLetter {
  const mentionsHotline = hasHotlineGuidance(textOf(parsed.blocks));
  if (!crisisWeek && !mentionsHotline) {
    return { blocks: parsed.blocks, refs: parsed.refs, quotesRemoved: false, hotlineAdded: false };
  }
  const blocks = parsed.blocks.filter((b) => b.type === "text");
  const hotlineAdded = crisisWeek && !mentionsHotline;
  if (hotlineAdded) {
    // 固定文のうち、受け止めの一言は AI の本文があるので省き、案内と窓口だけを足す
    for (const p of CRISIS_LETTER_PARAGRAPHS.slice(2)) blocks.push({ type: "text", text: p });
  }
  return { blocks, refs: [], quotesRemoved: parsed.refs.length > 0 || parsed.blocks.length !== blocks.length, hotlineAdded };
}

/** 危機の週に AI の手紙が使えない（refusal・max_tokens・失敗・空）ときの、固定文だけの手紙 */
export function crisisLetterBlocks(): LetterBlock[] {
  return CRISIS_LETTER_PARAGRAPHS.map((text) => ({ type: "text", text }));
}
