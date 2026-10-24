// Firestore データモデルの型（正は docs/ARCHITECTURE.md。v5 の追加分は docs/IMPLEMENTATION-CONTRACT.md §5）
// 既存の型（Profile / ShapedRecord / SHAPED_FIELDS）は旧 UI と移行スクリプトが使うので壊さない。

import type { MoodId } from "@/lib/logic/moods";

export type { MoodId };

export const STAGES = ["student", "year1", "year2", "year3plus"] as const;
export type Stage = (typeof STAGES)[number];

export type Profile = {
  /** 呼び名（最大12文字。空なら自動の呼び名〔lib/logic/autoName.ts〕を表示に使う。AI には nickname だけ渡す） */
  nickname: string;
  activity: string;
  stage: Stage | null;
  goal: string;
  /** ホームの「今週◯日」を隠す（任意・既定 false） */
  hideStreak?: boolean;
};

/** 成形結果（6項目＋タイトル）。旧 UI・移行完了前の thoughts に残る（Phase 13 の 60 で整理） */
export type ShapedRecord = {
  title: string;
  event: string;
  thinking: string;
  action: string;
  reason: string;
  emotion: string;
  values: string;
};

export const SHAPED_FIELDS = [
  { key: "event", label: "出来事" },
  { key: "thinking", label: "思考" },
  { key: "action", label: "行動" },
  { key: "reason", label: "理由" },
  { key: "emotion", label: "感情" },
  { key: "values", label: "価値観（AIの気づき）" },
] as const;

export const emptyProfile: Profile = {
  nickname: "",
  activity: "",
  stage: null,
  goal: "",
};

/* ---------- v5（Phase 12〜19）で追加 ---------- */

/** 記録の種類：full＝記録タブ（日記＋深掘り）／quick＝回転盤のあとの「一言」 */
export type ThoughtKind = "full" | "quick";

/**
 * users/{uid}/thoughts/{id}。本人の文章は AI が書き換えない。
 * 旧 6 項目（event…values）と旧 embedding は移行完了まで残る（型には含めない。読むときは unknown 扱い）。
 */
export type Thought = {
  id: string;
  /** "YYYY-MM-DD"（Asia/Tokyo）。過去日の記録はこの値が過去日になる */
  date: string;
  /** 本人の文章そのまま（full＝日記本文／quick＝一言） */
  rawText: string;
  /** 深掘りの質問（メンターの緑インク）。スキップ・quick は "" */
  deepDiveQuestion: string;
  /** 深掘りへの本人の答え。スキップ・quick は "" */
  deepDiveAnswer: string;
  /** 本文の先頭から自動で作る（最大20文字・AI は使わない。lib/logic/title.ts） */
  title: string;
  kind: ThoughtKind;
  /** quick のとき、保存時点の今日の気分（表示専用。full では省略） */
  mood?: MoodId;
  /** ISO 8601。GET の応答では createdAt をこの文字列で返す（Firestore 上は timestamp） */
  createdAt?: string;
};

/** 一覧 API（GET /api/thoughts）が返す形。embedding は返さない */
export type ThoughtSummary = Thought;

export type ChunkSource = "diary" | "deepdive";

/**
 * users/{uid}/chunks/{thoughtId}_{order}。RAG の検索単位。text は本人の言葉そのまま（分割するだけ）。
 * embedding の入力は meta があれば `${text}\n${meta}`、なければ text（表示には必ず text を使う）。
 */
export type Chunk = {
  id: string;
  thoughtId: string;
  date: string;
  text: string;
  source: ChunkSource;
  /** 同じ記録の中での順番（0 始まり。diary → deepdive の順） */
  order: number;
  /** 検索用の一行メタ（出来事・感情など。Phase 13 の 57 が裏で足す。quick は保存時に moodMetaLine を入れる）。画面にも相談にも出さない */
  meta?: string;
  /** Firestore 上は FieldValue.vector。読むときは lib/db/embeddingField.ts の readEmbedding */
  embedding?: unknown;
  createdAt?: string;
};

/** users/{uid}/moods/{YYYY-MM-DD} */
export type MoodEntry = {
  date: string;
  mood: MoodId;
  /** ISO 8601（Firestore 上は timestamp） */
  updatedAt?: string;
};

/** 風の記録（GET /api/moods）の1日分 */
export type DayEntry = {
  date: string;
  /** その日の気分。玉だけの日もここに入る。無ければ null */
  mood: MoodId | null;
  /** その日の記録（thoughts）の件数。quick も数える */
  records: number;
};

export type LetterStatus = "generating" | "ready" | "failed";

/** 手紙が引用した本人の言葉。quote は rawText / deepDiveAnswer の部分文字列そのまま（サーバーが検証する） */
export type LetterRef = {
  thoughtId: string;
  date: string;
  quote: string;
  /** 引用元の記録が削除されたら true にして quote を伏せる（憲法第13条。Phase 18 の 79） */
  deleted?: boolean;
};

/** 便箋の中身。text は緑インクの段落、quote は refs[ref] の切れ端（マスキングテープ） */
export type LetterBlock = { type: "text"; text: string } | { type: "quote"; ref: number };

/**
 * users/{uid}/letters/{weekKey}。weekKey はその週の月曜の "YYYY-MM-DD"（lib/logic/week.ts）。
 * RAG には入れない。AI には本人の言葉のチャンク＋日付だけ渡す。
 */
export type Letter = {
  weekKey: string;
  /** 週の月曜・日曜（"YYYY-MM-DD"） */
  from: string;
  to: string;
  status: LetterStatus;
  /** 宛名より後ろの本文（宛名は画面側が表示名から作る） */
  blocks: LetterBlock[];
  refs: LetterRef[];
  /** 月〜日の7日分の気分（無い日は null）。手紙の「今週の玉」 */
  moods: (MoodId | null)[];
  /** その週に記録（thoughts）があった日数 */
  recordDays: number;
  model: string;
  createdAt?: string;
  /** 初めて開いた時刻。未読なら null */
  readAt?: string | null;
};

/** 過去の手紙一覧の1行 */
export type LetterSummary = Pick<Letter, "weekKey" | "from" | "to" | "status" | "recordDays" | "readAt" | "createdAt">;
