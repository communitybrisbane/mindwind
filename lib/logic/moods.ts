// 気分の玉（5段階）の定数。文言・色は docs/prototype/ui-v5.html の M[] と一致させる（見た目の正はプロトタイプ）。
// 「今日の気分」は users/{uid}/moods/{YYYY-MM-DD}.mood に MoodId（0〜4）で保存する。
// 段階の言葉（追い風〜嵐）は気分にだけ使う。自動の呼び名には使わない（lib/logic/autoName.ts 側の決まり）。

export type MoodId = 0 | 1 | 2 | 3 | 4;

export type MoodKey = "tailwind" | "breeze" | "calm" | "headwind" | "storm";

export type MoodDef = {
  /** 0=追い風 … 4=嵐。保存値・配列の添字・プロトタイプの M[i] と同じ並び */
  id: MoodId;
  /** CSS クラス名・テストで使う英字キー */
  key: MoodKey;
  /** 玉の名前（回転盤のリール・風の記録の見出し） */
  name: string;
  /** 段階の説明の1行目（「とてもいい日。」など。回転盤のリールの説明の1行目） */
  stage: string;
  /** 段階の説明の2行目（回転盤のリールの説明の2行目） */
  description: string;
  /** 決めたあと・一言の画面の見出しに出るメンターの一言（AI は使わない固定文） */
  line: string;
  /** 玉の色（水彩の塗り。年のビューの点にもこの色だけを使う） */
  color: string;
  /** 濃い色（玉のふちの線） */
  deep: string;
};

export const MOODS: readonly MoodDef[] = [
  {
    id: 0,
    key: "tailwind",
    name: "追い風",
    stage: "とてもいい日。",
    description: "背中を押されて、すっと進める。",
    line: "いい風が吹いてるね。",
    color: "#3f9d78",
    deep: "#1f6a4c",
  },
  {
    id: 1,
    key: "breeze",
    name: "そよ風",
    stage: "いい日。",
    description: "おだやかで、心地いい。",
    line: "穏やかな日だね。",
    color: "#9fbf4f",
    deep: "#62802a",
  },
  {
    id: 2,
    key: "calm",
    name: "凪",
    stage: "ふつうの日。",
    description: "静かで、ただそこにいる。",
    line: "静かな日だね。",
    color: "#cdbf9f",
    deep: "#8d7f5c",
  },
  {
    id: 3,
    key: "headwind",
    name: "向かい風",
    stage: "つらい日。",
    description: "進みにくくて、力が要る。",
    line: "向かい風の日だね。",
    color: "#e49b3d",
    deep: "#a2641a",
  },
  {
    id: 4,
    key: "storm",
    name: "嵐",
    stage: "とてもつらい日。",
    description: "立っているだけで精いっぱい。",
    line: "大変な日だったんだね。",
    color: "#d9604d",
    deep: "#982f20",
  },
] as const;

export const MOOD_IDS: readonly MoodId[] = [0, 1, 2, 3, 4];

/** 0〜4 の整数なら MoodId。API の入力検証・Firestore から読んだ値の検証に使う */
export function isMoodId(value: unknown): value is MoodId {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4;
}

/** MoodId から定義を引く */
export function moodDef(id: MoodId): MoodDef {
  return MOODS[id];
}

/** 検索用メタ・一言の chunk に添える固定の一行（例：「気分：向かい風（つらい日）」）。本人の文章には混ぜない */
export function moodMetaLine(id: MoodId): string {
  const m = MOODS[id];
  return `気分：${m.name}（${m.stage.replace(/。$/, "")}）`;
}
