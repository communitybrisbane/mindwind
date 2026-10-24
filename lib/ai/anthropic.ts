import Anthropic from "@anthropic-ai/sdk";

// サーバー側専用（API キーをクライアントに露出させない）
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// モデル選定は docs/ARCHITECTURE.md「使用モデルと API 機能」が正
export const MODELS = {
  deepdive: "claude-haiku-4-5",
  shaping: "claude-sonnet-5",
  consult: "claude-opus-4-8",
  /** 検索用メタの生成（PLAN 57。docs/mentor-prompt.md：Haiku 4.5・thinking なし） */
  meta: "claude-haiku-4-5",
  /** 週の手紙（PLAN 77。2026-10-24 承認 A①：相談と同じ Opus 4.8・adaptive thinking・effort high） */
  letter: "claude-opus-4-8",
} as const;
