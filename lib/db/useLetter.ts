"use client";

// 週の手紙の取得（PLAN 78）。契約 §6 の /api/letters* を呼ぶ。
// - 今週：GET /api/letters/current → ready ならそのまま／none なら POST で生成（NDJSON）／locked・generating は状態だけ返す
// - 過去：GET /api/letters/[weekKey]
// - サンプルの手紙は「開発中に API のルート自体が無いとき」だけのフォールバック
//   （本番で作り物の「あなたの言葉」を見せないため。API が返す 404 { error: "not_found" } は届いていない扱い）
// - POST（生成）は AbortController で、画面を離れたら受信をやめる（サーバーは生成を続けて保存する）
// 手紙の本文・引用は API の値をそのまま使い、画面側で書き換えない。

import { useCallback, useEffect, useState } from "react";
import type {
  CurrentLetterResponse,
  LetterResponse,
  LetterStreamEvent,
  LettersListResponse,
} from "@/lib/api/contracts";
import type { Letter, LetterBlock, LetterSummary } from "@/lib/db/types";
import { authedFetch, authedJson, useUser, type AppUser } from "@/lib/db/useUser";
import { MIN_THOUGHTS_FOR_LETTER } from "@/lib/logic/limits";
import { todayKeyOf } from "@/lib/logic/moodDay";
import { addDays, letterWeekFor, weekRange } from "@/lib/logic/week";

export type LetterState =
  | { kind: "loading" }
  | { kind: "locked"; weekKey: string; recordDays: number; needed: number }
  | { kind: "generating"; weekKey: string }
  | { kind: "ready"; letter: Letter; sample: boolean }
  | { kind: "missing" }
  | { kind: "error"; message: string };

const ERROR_MESSAGE = "手紙をうまく受け取れなかった。少しあとで、もう一度開いてみてね";
const LIMIT_MESSAGE = "今日はここまで。また明日、開いてみてね";

const IS_DEV = process.env.NODE_ENV !== "production";

/* ---------- 開発用のサンプル（プロトタイプの文面） ---------- */

/** 開発用のサンプルの手紙（開発中に API のルートが無いときだけ。本番では使わない） */
export function sampleLetter(weekKey: string): Letter {
  const { from, to } = weekRange(weekKey);
  return {
    weekKey,
    from,
    to,
    status: "ready",
    blocks: [
      { type: "text", text: "今週もおつかれさま。\n今週は5日、ここに来てくれたね。" },
      { type: "text", text: "火曜の会議のあと、こう書いてた。" },
      { type: "quote", ref: 0 },
      { type: "text", text: "そして金曜には、こうも書いてる。" },
      { type: "quote", ref: 1 },
      { type: "text", text: "同じ「言えない」でも、金曜は動き方が少し違ったみたい。" },
      {
        type: "text",
        text: "今回もそうとは限らないけど、来週の会議の前にも、一行だけメモしてみるのはどうかな。",
      },
    ],
    refs: [
      { thoughtId: "sample-1", date: addDays(from, 1), quote: "言いたいことはあったのに、タイミングが分からなかった。" },
      { thoughtId: "sample-2", date: addDays(from, 4), quote: "先に一行だけメモしてから行ったら、少し話せた。" },
    ],
    moods: [1, 3, null, 2, 1, null, 3],
    recordDays: 5,
    model: "sample",
    readAt: null,
  };
}

/* ---------- 便箋の3枚への振り分け（純粋ロジック） ---------- */

/** 1枚目の頭（日付・宛名・今週の玉）と3枚目の署名の重み（文字数の目安） */
const HEAD_WEIGHT = 120;
const SIGN_WEIGHT = 60;
/** 切れ端1枚の重み（4行ぶん） */
const QUOTE_WEIGHT = 90;

function blockWeight(b: LetterBlock): number {
  return b.type === "quote" ? QUOTE_WEIGHT : Math.max(20, b.text.length);
}

/**
 * 本文のブロックを三つ折りの3枚へ順番どおりに振り分ける（順序は変えない・ブロックは割らない）。
 * 1枚目は頭、3枚目は署名のぶんだけ軽くする。
 */
export function splitIntoPanels(blocks: LetterBlock[]): [LetterBlock[], LetterBlock[], LetterBlock[]] {
  const panels: [LetterBlock[], LetterBlock[], LetterBlock[]] = [[], [], []];
  const total = HEAD_WEIGHT + SIGN_WEIGHT + blocks.reduce((s, b) => s + blockWeight(b), 0);
  const target = total / 3;
  let acc = HEAD_WEIGHT;
  let i = 0;
  blocks.forEach((b, idx) => {
    const w = blockWeight(b);
    const remaining = blocks.length - idx;
    // 次の枚へ進む：半分以上はみ出す、かつ今の枚に何か入っている。残りが少ないときは後ろの枚を空けないよう早めに進む
    while (i < 2 && panels[i].length > 0 && (acc + w / 2 > target * (i + 1) || remaining <= 2 - i)) {
      i += 1;
    }
    panels[i].push(b);
    acc += w;
  });
  return panels;
}

/* ---------- 取得 ---------- */

async function readStream(res: Response, onDone: (l: Letter) => void): Promise<"done" | "error"> {
  if (!res.body) return "error";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try {
          const ev = JSON.parse(line) as LetterStreamEvent;
          if (ev.type === "done") {
            onDone(ev.letter);
            return "done";
          }
          if (ev.type === "error") return "error";
        } catch {
          // 壊れた行は読み飛ばす
        }
      }
      nl = buf.indexOf("\n");
    }
    if (done) return "error";
  }
}

/** API のルートそのものが無い（Next の 404/405 ページ。JSON の { error } ではない）。開発中のサンプル表示にだけ使う */
function isRouteMissing(res: Response): boolean {
  if (res.status !== 404 && res.status !== 405) return false;
  return !(res.headers.get("content-type") ?? "").includes("application/json");
}

async function fetchCurrent(user: AppUser, signal: AbortSignal): Promise<LetterState> {
  const res = await authedFetch(user, "/api/letters/current", { signal });
  if (isRouteMissing(res)) {
    return IS_DEV
      ? { kind: "ready", letter: sampleLetter(letterWeekFor(todayKeyOf())), sample: true }
      : { kind: "missing" };
  }
  if (!res.ok) return { kind: "error", message: ERROR_MESSAGE };
  const data = (await res.json()) as CurrentLetterResponse;
  switch (data.status) {
    case "ready":
      return data.letter ? { kind: "ready", letter: data.letter, sample: false } : { kind: "error", message: ERROR_MESSAGE };
    case "locked":
      return {
        kind: "locked",
        weekKey: data.weekKey,
        recordDays: data.recordDays,
        needed: data.needed ?? MIN_THOUGHTS_FOR_LETTER,
      };
    case "generating":
      return { kind: "generating", weekKey: data.weekKey };
    case "none":
    default:
      return generate(user, data.weekKey, signal);
  }
}

async function generate(user: AppUser, weekKey: string, signal: AbortSignal): Promise<LetterState> {
  const res = await authedFetch(user, "/api/letters/current", { method: "POST", signal });
  if (isRouteMissing(res)) {
    return IS_DEV ? { kind: "ready", letter: sampleLetter(weekKey), sample: true } : { kind: "missing" };
  }
  if (res.status === 429) return { kind: "error", message: LIMIT_MESSAGE };
  if (res.status === 409) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; recordDays?: number; needed?: number }
      | null;
    if (body?.error === "already_generating") return { kind: "generating", weekKey };
    if (body?.error === "too_few_records") {
      return {
        kind: "locked",
        weekKey,
        recordDays: typeof body.recordDays === "number" ? body.recordDays : 0,
        needed: typeof body.needed === "number" ? body.needed : MIN_THOUGHTS_FOR_LETTER,
      };
    }
    return { kind: "missing" };
  }
  if (!res.ok) return { kind: "error", message: ERROR_MESSAGE };
  let letter: Letter | null = null;
  const r = await readStream(res, (l) => {
    letter = l;
  });
  return r === "done" && letter ? { kind: "ready", letter, sample: false } : { kind: "error", message: ERROR_MESSAGE };
}

async function fetchWeek(user: AppUser, weekKey: string, signal: AbortSignal): Promise<LetterState> {
  const res = await authedFetch(user, `/api/letters/${encodeURIComponent(weekKey)}`, { signal });
  if (isRouteMissing(res)) {
    return IS_DEV ? { kind: "ready", letter: sampleLetter(weekKey), sample: true } : { kind: "missing" };
  }
  if (res.status === 404) return { kind: "missing" };
  if (!res.ok) return { kind: "error", message: ERROR_MESSAGE };
  const data = (await res.json()) as LetterResponse;
  return data.letter ? { kind: "ready", letter: data.letter, sample: false } : { kind: "missing" };
}

/** 生成中のとき、取り直すまでの待ち時間 */
const GENERATING_RETRY_MS = 4000;

/** 手紙を1通取る。week を渡すと過去の手紙（null＝今週） */
export function useLetter(week: string | null): { state: LetterState; reload(): void } {
  const { user } = useUser();
  const [state, setState] = useState<LetterState>({ kind: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 画面を離れたら（week が変わったら）取得・生成の受信をやめる
    const controller = new AbortController();
    const run = () => {
      (week ? fetchWeek(user, week, controller.signal) : fetchCurrent(user, controller.signal))
        .then((s) => {
          if (cancelled) return;
          setState(s);
          if (s.kind === "generating") timer = setTimeout(run, GENERATING_RETRY_MS);
        })
        .catch(() => {
          if (!cancelled) setState({ kind: "error", message: ERROR_MESSAGE });
        });
    };
    run();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [user, week, version]);

  const reload = useCallback(() => {
    setState({ kind: "loading" });
    setVersion((v) => v + 1);
  }, []);
  return { state, reload };
}

/** 既読にする（失敗しても画面は止めない） */
export async function markLetterRead(user: AppUser, weekKey: string): Promise<void> {
  try {
    await authedJson(user, "PUT", `/api/letters/${encodeURIComponent(weekKey)}`, { read: true });
  } catch {
    // 既読は次に開いたときにまた付ける
  }
}

/** 手紙を消す（完全削除。憲法第13条）。成功で true */
export async function deleteLetter(user: AppUser, weekKey: string): Promise<boolean> {
  try {
    const res = await authedFetch(user, `/api/letters/${encodeURIComponent(weekKey)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/** 過去の手紙の一覧（新しい週が先）。API が無いときは空 */
export function useLetterList(enabled: boolean): {
  letters: LetterSummary[] | null;
  remove(weekKey: string): Promise<boolean>;
} {
  const { user } = useUser();
  const [letters, setLetters] = useState<LetterSummary[] | null>(null);

  useEffect(() => {
    if (!user || !enabled) return;
    let cancelled = false;
    authedFetch(user, "/api/letters")
      .then(async (res) => {
        const data = res.ok ? ((await res.json()) as LettersListResponse) : null;
        if (!cancelled) setLetters(Array.isArray(data?.letters) ? data.letters : []);
      })
      .catch(() => {
        if (!cancelled) setLetters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, enabled]);

  const remove = useCallback(
    async (weekKey: string) => {
      if (!user) return false;
      const ok = await deleteLetter(user, weekKey);
      if (ok) setLetters((ls) => (ls ? ls.filter((l) => l.weekKey !== weekKey) : ls));
      return ok;
    },
    [user]
  );

  return { letters, remove };
}
