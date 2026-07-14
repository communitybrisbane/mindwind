// Firestore データモデルの型（正は docs/ARCHITECTURE.md）

export const STAGES = ["student", "year1", "year2", "year3plus"] as const;
export type Stage = (typeof STAGES)[number];

export type Profile = {
  nickname: string;
  activity: string;
  stage: Stage | null;
  goal: string;
};

export const emptyProfile: Profile = {
  nickname: "",
  activity: "",
  stage: null,
  goal: "",
};
