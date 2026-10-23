import type { ChunkSource, ThoughtKind } from "@/lib/db/types";

export type ChunkInput = {
  rawText: string;
  deepDiveQuestion: string;
  deepDiveAnswer: string;
  kind: ThoughtKind;
};

export type ChunkPiece = { text: string; source: ChunkSource; order: number };

const MIN = 200;
const MAX = 400;

/** 文末記号（。！？!?）＋閉じ括弧＋後ろの空白・改行までを1単位にする。連結すると元に戻る。 */
function toUnits(text: string): Array<{ text: string; paragraphEnd: boolean }> {
  const units: Array<{ text: string; paragraphEnd: boolean }> = [];
  const re = /[^。！？!?\n]*(?:[。！？!?]+[」』）)”"’'】]*|(?=\n))\s*/gy;
  let pos = 0;
  while (pos < text.length) {
    re.lastIndex = pos;
    const m = re.exec(text);
    let piece: string;
    if (m && m[0].length > 0) piece = m[0];
    else piece = text.slice(pos); // 文末記号も改行も無い残り
    units.push({
      text: piece,
      paragraphEnd: (piece.match(/\n/g)?.length ?? 0) >= 2,
    });
    pos += piece.length;
  }
  return units;
}

/** 本文を文の境界で 200〜400 字目安に分ける（書き換えない・連結すると元の本文に戻る） */
function splitDiary(text: string): string[] {
  if (text.length === 0) return [];
  if (text.length <= MAX) return [text];
  const out: string[] = [];
  let cur = "";
  for (const u of toUnits(text)) {
    if (cur.length >= MIN && cur.length + u.text.length > MAX) {
      out.push(cur);
      cur = "";
    }
    cur += u.text;
    if (cur.length >= MIN && u.paragraphEnd) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) {
    const last = out[out.length - 1];
    // 端数が短いときは直前に足す（小さな断片を作らない）
    if (last !== undefined && (cur.length < MIN / 2 || last.length + cur.length <= MAX)) {
      out[out.length - 1] = last + cur;
    } else out.push(cur);
  }
  return out;
}

/** 本人の言葉を書き換えずに分ける。diary チャンク → 深掘り Q&A（1チャンク）の順。 */
export function splitIntoChunks(input: ChunkInput): ChunkPiece[] {
  const pieces: Array<{ text: string; source: ChunkSource }> = [];
  const diary = input.kind === "quick" ? (input.rawText ? [input.rawText] : []) : splitDiary(input.rawText);
  for (const t of diary) pieces.push({ text: t, source: "diary" });
  if (input.deepDiveAnswer.trim()) {
    const q = input.deepDiveQuestion.trim();
    pieces.push({
      text: q ? `Q: ${q}\nA: ${input.deepDiveAnswer}` : `A: ${input.deepDiveAnswer}`,
      source: "deepdive",
    });
  }
  return pieces.map((p, order) => ({ ...p, order }));
}
