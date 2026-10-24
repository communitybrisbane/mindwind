"use client";

// 一言（quick）の記録を「あとから深掘りする」（PLAN タスク65）。
// 一言をそのまま /api/deepdive に送って1問をもらい、答えを PUT /api/thoughts/[id] で足す（チャンク・embedding はサーバーが作り直す）。
// 本人の一言（rawText）は送らない＝書き換えない。mood は PUT が触らないので保たれる。
// 答えの下書きは端末内だけ（useDraft）。もらった問いも一緒に残し、開き直したときに AI を呼び直さない。

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/components/ui/Toast";
import type { ApiError, UpdateThoughtRequest, UpdateThoughtResponse } from "@/lib/api/contracts";
import type { ThoughtSummary } from "@/lib/db/types";
import { authedJson, type useUser } from "@/lib/db/useUser";
import { MAX_DIARY_LENGTH, MIN_DIARY_LENGTH } from "@/lib/logic/limits";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useDraft } from "@/lib/ui/useDraft";
import { useLimitedInput } from "@/lib/ui/useLimitedInput";

type User = NonNullable<ReturnType<typeof useUser>["user"]>;

/** 封蝋の演出の長さ（記録タブの封と同じ 1100ms） */
const SEAL_MS = 1100;
const AI_LIMIT_MESSAGE = "今日の AI の利用上限に達しました。また明日、深掘りしよう";
const ASK_FAILED_MESSAGE = "質問を用意できませんでした。少し待ってからもう一度試してください。";

/** 下書きのキー（記録タブの today / past とは別。記録ごとに1つ） */
export function quickDeepDiveDraftKey(thoughtId: string): string {
  return `mindwind:draft:deepen:${thoughtId}`;
}

/**
 * この記録に「あとから深掘りする」を出せるか。
 * quick で、まだ深掘りの問いが無いもの。/api/deepdive は MIN_DIARY_LENGTH 未満を受け付けないので、それより短い一言は出さない。
 */
export function canDeepenLater(t: ThoughtSummary | null | undefined): t is ThoughtSummary {
  return !!t && t.kind === "quick" && t.deepDiveQuestion === "" && t.rawText.trim().length >= MIN_DIARY_LENGTH;
}

export type QuickDeepDivePhase = "idle" | "asking" | "answer" | "sealing";

/**
 * 深掘りの状態。ThoughtModal が持ち、問いと答えの欄は SavedSheet に、ボタンはモーダルの下に出す。
 * thought が変わる（めくる）たびに作り直す前提（呼び出し側で key を付けるか、reset を呼ぶ）。
 */
export function useQuickDeepDive({
  user,
  thought,
  onSaved,
  onCrisis,
}: {
  user: User | null;
  thought: ThoughtSummary | null;
  onSaved: (updated: ThoughtSummary) => void;
  /** 足した答えに危機の言葉があった（保存は成功。呼び出し側が窓口を案内する。PLAN 85） */
  onCrisis?: () => void;
}) {
  const [phase, setPhase] = useState<QuickDeepDivePhase>("idle");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const answer = useLimitedInput({ max: MAX_DIARY_LENGTH, label: "答えは" });
  const draft = useDraft(quickDeepDiveDraftKey(thought?.id ?? "_"));
  // 問いを待っている間に「とばす」が押されたら、あとから届いた問いは捨てる
  const askSeq = useRef(0);

  // 答えを書いている間だけ下書きを残す（空になったら消す）
  const { save: saveDraft, clear: clearDraft } = draft;
  useEffect(() => {
    if (phase !== "answer" || !thought) return;
    if (answer.value.trim() === "") {
      clearDraft();
      return;
    }
    saveDraft({
      rawText: thought.rawText,
      deepDiveQuestion: question,
      deepDiveAnswer: answer.value,
      step: 2,
      savedAt: Date.now(),
    });
  }, [phase, thought, question, answer.value, saveDraft, clearDraft]);

  /** 下書きがあれば戻す（同じ一言に対する問いのときだけ）。無ければ1問をもらう */
  async function start() {
    if (!user || !thought || phase !== "idle") return;
    setError("");
    const d = draft.draft;
    if (d && d.rawText === thought.rawText && d.deepDiveQuestion) {
      setQuestion(d.deepDiveQuestion);
      answer.setValue(d.deepDiveAnswer);
      setPhase("answer");
      vibrate(8);
      sound("rub");
      return;
    }
    setPhase("asking");
    const seq = ++askSeq.current;
    try {
      const res = await authedJson(user, "POST", "/api/deepdive", { diary: thought.rawText.trim() });
      if (seq !== askSeq.current) return;
      if (res.status === 429) {
        setError(AI_LIMIT_MESSAGE);
        setPhase("idle");
        return;
      }
      if (!res.ok) throw new Error(`deepdive ${res.status}`);
      const { question: q } = (await res.json()) as { question: string };
      if (seq !== askSeq.current) return;
      setQuestion(q);
      answer.setValue("");
      setPhase("answer");
      vibrate([10, 20, 14]);
      sound("rub");
    } catch {
      if (seq !== askSeq.current) return;
      setError(ASK_FAILED_MESSAGE);
      setPhase("idle");
    }
  }

  /** とばす／やめる：何も足さずに元の表示へ（答えが無いときは問いも残さない＝記録の保存と同じ） */
  function cancel() {
    if (phase === "sealing") return;
    askSeq.current += 1;
    clearDraft();
    setQuestion("");
    answer.setValue("");
    setError("");
    setPhase("idle");
  }

  /** 長押しで封をして、答えを記録に足す */
  async function seal() {
    if (!user || !thought || phase !== "answer") return;
    const ans = answer.value.trim();
    if (!ans) {
      showToast("答えを書いてから、長押ししてね（とばしてもいいよ）");
      vibrate(30);
      return;
    }
    setError("");
    setPhase("sealing");
    sound("seal");
    vibrate([20, 40, 36]);
    const wait = new Promise((r) => setTimeout(r, SEAL_MS));
    // 本人の一言は送らない（書き換えない）。問いと答えだけを足す
    const body: UpdateThoughtRequest = { deepDiveQuestion: question, deepDiveAnswer: ans };
    try {
      const res = await authedJson(user, "PUT", `/api/thoughts/${thought.id}`, body);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        if (data?.error === "conflict") throw new Error("別の画面で先にこの記録が直されたみたい。開き直してから、もう一度試してね。");
        if (data?.error === "too_long") throw new Error(`答えは${MAX_DIARY_LENGTH}文字までだよ`);
        if (res.status === 404) throw new Error("この記録は見つかりませんでした。");
        throw new Error("保存できませんでした。少し待ってからもう一度試してください。");
      }
      const { title, crisis } = (await res.json()) as UpdateThoughtResponse;
      await wait;
      clearDraft();
      onSaved({ ...thought, deepDiveQuestion: question, deepDiveAnswer: ans, title });
      setQuestion("");
      answer.setValue("");
      setPhase("idle");
      showToast("深掘りの答えを足したよ。");
      if (crisis === true) onCrisis?.();
    } catch (e) {
      await wait;
      setPhase("answer");
      setError(e instanceof Error && e.message ? e.message : "保存できませんでした。");
    }
  }

  return {
    phase,
    /** 問いと答えの欄を出している間（asking を含む） */
    active: phase !== "idle",
    question,
    answer,
    error,
    start,
    cancel,
    seal,
  };
}

export type QuickDeepDiveState = ReturnType<typeof useQuickDeepDive>;
