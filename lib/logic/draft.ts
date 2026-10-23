// 下書きの端末内保存（純粋ロジック）。サーバーには送らない。
// 契約: docs/IMPLEMENTATION-CONTRACT.md「lib/logic/draft.ts（68）」

export type DraftData = {
  rawText: string;
  deepDiveQuestion: string;
  deepDiveAnswer: string;
  step: 1 | 2;
  savedAt: number;
};

export const DRAFT_DEBOUNCE_MS = 500;

const KEY_PREFIX = "mindwind:draft:";

/** 今日モードと過去日モードは別のキー。 */
export function draftKey(mode: "today" | "past", dateKey: string): string {
  return `${KEY_PREFIX}${mode}:${dateKey}`;
}

/** 何も書かれていない下書きは保存しない（深掘りの質問だけが残っても空扱い）。 */
export function isDraftEmpty(d: Pick<DraftData, "rawText" | "deepDiveAnswer">): boolean {
  return d.rawText.trim() === "" && d.deepDiveAnswer.trim() === "";
}

export function serializeDraft(d: DraftData): string {
  return JSON.stringify(d);
}

/** 保存された文字列を読む。壊れている・形が違うときは null（落ちない）。 */
export function parseDraft(raw: string | null | undefined): DraftData | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.rawText !== "string" ||
    typeof o.deepDiveQuestion !== "string" ||
    typeof o.deepDiveAnswer !== "string" ||
    (o.step !== 1 && o.step !== 2) ||
    typeof o.savedAt !== "number" ||
    !Number.isFinite(o.savedAt)
  ) {
    return null;
  }
  return {
    rawText: o.rawText,
    deepDiveQuestion: o.deepDiveQuestion,
    deepDiveAnswer: o.deepDiveAnswer,
    step: o.step,
    savedAt: o.savedAt,
  };
}

type TimerApi = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

export type DebouncedSaver<T> = {
  /** 最後の呼び出しから wait ms 後に実行。それまでの値は捨てる。 */
  call(value: T): void;
  /** 待っている分を今すぐ実行（画面を離れるとき用）。 */
  flush(): void;
  /** 待っている分を捨てる（保存成功で下書きを消すとき用）。 */
  cancel(): void;
};

export function createDebouncedSaver<T>(
  run: (value: T) => void,
  wait: number = DRAFT_DEBOUNCE_MS,
  timers: TimerApi = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  },
): DebouncedSaver<T> {
  let timer: unknown = null;
  let pending: { value: T } | null = null;

  const fire = () => {
    timer = null;
    if (!pending) return;
    const { value } = pending;
    pending = null;
    run(value);
  };

  return {
    call(value) {
      pending = { value };
      if (timer !== null) timers.clearTimeout(timer);
      timer = timers.setTimeout(fire, wait);
    },
    flush() {
      if (timer !== null) timers.clearTimeout(timer);
      fire();
    },
    cancel() {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
