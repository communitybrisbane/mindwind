// Firestore データモデルの型（正は docs/ARCHITECTURE.md）

export const STAGES = ["student", "year1", "year2", "year3plus"] as const;
export type Stage = (typeof STAGES)[number];

export type Profile = {
  nickname: string;
  activity: string;
  stage: Stage | null;
  goal: string;
};

/** 成形結果（6項目＋タイトル）。thoughts への保存フィールド名と一致させる */
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
