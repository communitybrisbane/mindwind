"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canDeepenLater, useQuickDeepDive } from "@/components/record/QuickDeepDive";
import { SealHoldButton, SealStamp } from "@/components/record/SealHold";
import { Bead, BeadSlot } from "@/components/ui/Bead";
import { Dialog } from "@/components/ui/Dialog";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import { showToast } from "@/components/ui/Toast";
import type { ApiError, ThoughtsListResponse, UpdateThoughtRequest, UpdateThoughtResponse } from "@/lib/api/contracts";
import type { MoodId, ThoughtSummary } from "@/lib/db/types";
import { authedFetch, authedJson, useUser } from "@/lib/db/useUser";
import { formatDateHeading, tokyoDateKey, tokyoDayStart } from "@/lib/logic/date";
import {
  DIARY_TOO_SHORT_MESSAGE,
  MAX_DIARY_LENGTH,
  MAX_QUICK_LENGTH,
  MIN_DIARY_LENGTH,
  MIN_QUICK_LENGTH,
} from "@/lib/logic/limits";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useLimitedInput } from "@/lib/ui/useLimitedInput";
import SavedSheet from "./SavedSheet";
import styles from "./thought.module.css";

export type ThoughtModalProps = {
  /** 省略時 true（条件つきで描画する使い方もできる） */
  open?: boolean;
  /** 1件だけ見せるとき（thoughts=[thought] と同じ） */
  thought?: ThoughtSummary | null;
  /** 見せる記録（同じ日の複数件は左右でめくる）。省略して date を渡すと、その日の分を取りに行く */
  thoughts?: ThoughtSummary[];
  /** "YYYY-MM-DD"。thoughts を省略したときの取得先。記録0件のとき「この日の日記を書く」の行き先にも使う */
  date?: string;
  /** 最初に開く記録 */
  initialId?: string;
  /** 記録0件の日に出す玉（風の記録から渡す。無ければ点線の輪） */
  mood?: MoodId | null;
  onClose: () => void;
  onUpdated?: (t: ThoughtSummary) => void;
  /** onUpdated の別名（風の記録の DayModal が使う） */
  onSaved?: (t: ThoughtSummary) => void;
  /** 消したあと。渡さないときは、最後の1件を消したらモーダルを閉じる */
  onDeleted?: (id: string) => void;
};

/**
 * 保存済みの記録のモーダル（記録タブのしおり・風の記録の日付から開く）。
 * 少し傾いた紙に、日付（緑の波線）・本人の文章・深掘りの問いと答え。下に とじる／編集／削除。
 * 編集は本文と深掘りの答えを直して PUT /api/thoughts/[id]。削除は確認ダイアログで長押し（完全削除）。
 * 一言（quick）でまだ深掘りが無い記録は「あとから深掘りする」で1問をもらい、答えを長押しの封で足せる（タスク65）。
 */
export default function ThoughtModal(props: ThoughtModalProps) {
  // 開くたびに中の状態（めくり位置・編集中）を作り直す
  if (props.open === false) return null;
  const { thought, thoughts, ...rest } = props;
  const list = thoughts ?? (thought ? [thought] : undefined);
  return (
    <ThoughtModalBody
      key={`${props.initialId ?? thought?.id ?? ""}:${props.date ?? ""}`}
      {...rest}
      thoughts={list}
      initialId={props.initialId ?? thought?.id}
    />
  );
}

function ThoughtModalBody({
  thoughts: given,
  date,
  initialId,
  mood,
  onClose,
  onUpdated,
  onSaved,
  onDeleted,
}: Omit<ThoughtModalProps, "thought">) {
  const router = useRouter();
  const { user } = useUser();
  const [fetched, setFetched] = useState<ThoughtSummary[] | null>(null);
  // 編集・削除の結果をこの中でも反映する（親が thoughts を渡していても、すぐ見た目に出す）
  const [local, setLocal] = useState<Record<string, ThoughtSummary | null>>({});
  const [index, setIndex] = useState(() => {
    const i = given && initialId ? given.findIndex((t) => t.id === initialId) : -1;
    return i < 0 ? 0 : i;
  });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // thoughts を省略したときは、その日の分を取りに行く
  useEffect(() => {
    if (given || !date || !user) return;
    let alive = true;
    authedFetch(user, `/api/thoughts?date=${date}`)
      .then((res) => (res.ok ? (res.json() as Promise<ThoughtsListResponse>) : { thoughts: [] }))
      .then((data) => {
        if (!alive) return;
        const list = [...data.thoughts].reverse();
        setFetched(list);
        if (initialId) {
          const i = list.findIndex((t) => t.id === initialId);
          if (i >= 0) setIndex(i);
        }
      })
      .catch(() => alive && setFetched([]));
    return () => {
      alive = false;
    };
  }, [given, date, user, initialId]);

  const base = given ?? fetched;
  const list = base
    ? base.flatMap((t) => {
        const o = local[t.id];
        if (o === null) return [];
        return [o ?? t];
      })
    : null;
  const safeIndex = list && list.length > 0 ? Math.min(index, list.length - 1) : 0;
  const thought = list && list.length > 0 ? list[safeIndex] : null;

  const isQuick = thought?.kind === "quick";
  const raw = useLimitedInput({ max: isQuick ? MAX_QUICK_LENGTH : MAX_DIARY_LENGTH, label: isQuick ? "一言は" : "日記は" });
  const ans = useLimitedInput({ max: MAX_DIARY_LENGTH, label: "答えは" });

  function applyUpdate(updated: ThoughtSummary) {
    setLocal((m) => ({ ...m, [updated.id]: updated }));
    onUpdated?.(updated);
    onSaved?.(updated);
  }

  const deep = useQuickDeepDive({ user, thought, onSaved: applyUpdate });
  const deepening = deep.active;

  // Esc で閉じる（確認ダイアログが出ている間はダイアログ側が閉じる）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmDelete) {
        if (editing) setEditing(false);
        else if (deepening) deep.cancel();
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete, editing, deepening, deep, onClose]);

  const dayKey = thought?.date ?? date ?? "";
  const heading = dayKey ? `${formatDateHeading(tokyoDayStart(dayKey))}の記録` : "";

  function startEdit() {
    if (!thought) return;
    raw.setValue(thought.rawText);
    ans.setValue(thought.deepDiveAnswer);
    setError("");
    setEditing(true);
    vibrate(8);
    sound("rub");
  }

  async function saveEdit() {
    if (!user || !thought || busy) return;
    const rawText = raw.value.trim();
    if (isQuick ? rawText.length < MIN_QUICK_LENGTH : rawText.length < MIN_DIARY_LENGTH) {
      setError(isQuick ? `もう少し書いてみてね（${MIN_QUICK_LENGTH}文字以上）` : DIARY_TOO_SHORT_MESSAGE);
      vibrate(30);
      return;
    }
    const body: UpdateThoughtRequest = { rawText };
    const hasDeepDive = thought.deepDiveQuestion !== "";
    let nextAnswer = thought.deepDiveAnswer;
    let nextQuestion = thought.deepDiveQuestion;
    if (hasDeepDive) {
      nextAnswer = ans.value.trim();
      body.deepDiveAnswer = nextAnswer;
      // 答えを消したら、問いも残さない（保存時と同じ：答えがあるときだけ問いを残す）
      if (!nextAnswer) {
        nextQuestion = "";
        body.deepDiveQuestion = "";
      }
    }
    setBusy(true);
    setError("");
    try {
      const res = await authedJson(user, "PUT", `/api/thoughts/${thought.id}`, body);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        if (data?.error === "too_short") throw new Error(DIARY_TOO_SHORT_MESSAGE);
        if (data?.error === "conflict") throw new Error("別の画面で先にこの記録が直されたみたい。開き直してから、もう一度試してね。");
        if (res.status === 404) throw new Error("この記録は見つかりませんでした。");
        throw new Error("保存できませんでした。少し待ってからもう一度試してください。");
      }
      const { title } = (await res.json()) as UpdateThoughtResponse;
      const updated: ThoughtSummary = {
        ...thought,
        rawText,
        deepDiveQuestion: nextQuestion,
        deepDiveAnswer: nextAnswer,
        title,
      };
      applyUpdate(updated);
      setEditing(false);
      sound("seal");
      showToast("記録を直したよ。");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !thought || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch(user, `/api/thoughts/${thought.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
      setLocal((m) => ({ ...m, [thought.id]: null }));
      showToast("記録を消しました");
      if (onDeleted) onDeleted(thought.id);
      // 最後の1件を消したら閉じる（親が onDeleted で面倒を見るときは任せる）
      else if (list && list.length <= 1) onClose();
    } catch {
      setError("消せませんでした。少し待ってからもう一度試してください。");
    } finally {
      setBusy(false);
    }
  }

  function writeThatDay() {
    const today = tokyoDateKey(new Date());
    onClose();
    router.push(!date || date >= today ? "/record" : `/record?date=${date}`);
  }

  const loading = list === null;
  const empty = !loading && !thought;

  return (
    <div className={styles.veil} onClick={() => !editing && !deepening && onClose()} role="presentation">
      <div className={styles.stage} onClick={(e) => e.stopPropagation()}>
        <Paper as="article" role="dialog" aria-modal aria-label={heading || "記録"} className={styles.sheet}>
          {heading && <div className={styles.date}>{heading}</div>}

          {loading && <p className={styles.wait}>ひらいているよ…</p>}

          {empty && (
            <div className={styles.empty}>
              {mood != null ? <Bead mood={mood} size={52} /> : <BeadSlot size={52} />}
              <p className={styles.emptyText}>この日は、まだ何も書いていないよ。</p>
            </div>
          )}

          {thought && (
            <div className={styles.scroll}>
              <SavedSheet
                thought={thought}
                editing={editing}
                rawField={{ value: raw.value, onChange: raw.onChange, shaking: raw.shaking, counter: raw.counter }}
                answerField={{ value: ans.value, onChange: ans.onChange, shaking: ans.shaking, counter: ans.counter }}
                deepen={
                  deepening
                    ? {
                        question: deep.question,
                        readOnly: deep.phase === "sealing",
                        answerField: {
                          value: deep.answer.value,
                          onChange: deep.answer.onChange,
                          shaking: deep.answer.shaking,
                          counter: deep.answer.counter,
                        },
                      }
                    : undefined
                }
              />
            </div>
          )}

          {(error || deep.error) && (
            <p className={styles.error} role="alert">
              ※ {error || deep.error}
            </p>
          )}

          {deepening && thought && <SealStamp mood={thought.mood ?? null} playing={deep.phase === "sealing"} />}

          {list && list.length > 1 && !editing && !deepening && (
            <div className={styles.pager}>
              <RoundButton
                variant="ink"
                icon="arrowL"
                aria-label="前の記録"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex === 0}
              />
              <span className={styles.pageNo}>
                {safeIndex + 1} / {list.length}
              </span>
              <RoundButton
                variant="ink"
                icon="arrow"
                aria-label="次の記録"
                onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
                disabled={safeIndex >= list.length - 1}
              />
            </div>
          )}
        </Paper>

        <div className={[styles.buttons, !editing && !deepening && canDeepenLater(thought) ? styles.many : ""].filter(Boolean).join(" ")}>
          {deepening ? (
            <>
              <RoundButton
                icon="arrow"
                label="とばす"
                aria-label="質問をとばす"
                size={62}
                onClick={() => {
                  sound("tick");
                  deep.cancel();
                }}
                disabled={deep.phase === "sealing"}
              />
              <SealHoldButton onSeal={() => void deep.seal()} disabled={deep.phase !== "answer"} />
            </>
          ) : editing ? (
            <>
              <RoundButton icon="undo" label="やめる" aria-label="直すのをやめる" size={62} onClick={() => setEditing(false)} disabled={busy} />
              <RoundButton variant="green" icon="check" label="保存する" aria-label="直した記録を保存する" size={72} onClick={() => void saveEdit()} disabled={busy} />
            </>
          ) : empty ? (
            <>
              <RoundButton icon="check" label="とじる" aria-label="とじる" size={62} onClick={onClose} />
              {date && (
                <RoundButton
                  variant="green"
                  icon="book"
                  label={date >= tokyoDateKey(new Date()) ? "今日の日記を書く" : "この日の日記を書く"}
                  aria-label={date >= tokyoDateKey(new Date()) ? "今日の日記を書く" : "この日の日記を書く"}
                  size={72}
                  onClick={writeThatDay}
                />
              )}
            </>
          ) : (
            <>
              <RoundButton icon="check" label="とじる" aria-label="とじる" size={62} onClick={onClose} />
              {canDeepenLater(thought) && (
                <RoundButton
                  variant="green"
                  icon="pencil"
                  label="深掘りする"
                  aria-label="あとから深掘りする"
                  size={62}
                  onClick={() => void deep.start()}
                  disabled={busy}
                />
              )}
              <RoundButton icon="pencil" label="なおす" aria-label="この記録を直す" size={62} onClick={startEdit} disabled={!thought || busy} />
              <RoundButton
                variant="warn"
                icon="trash"
                label="消す"
                aria-label="この記録を消す"
                size={62}
                onClick={() => setConfirmDelete(true)}
                disabled={!thought || busy}
              />
            </>
          )}
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <Dialog
          open={confirmDelete}
          title="この記録を消しますか？"
          text={
            <>
              本文も深掘りの答えも、<b>完全に消します</b>。元に戻せません。
              <br />
              <br />
              消すときは、右の赤いボタンを<b>長押し</b>します。
            </>
          }
          buttons={[
            { icon: "undo", label: "やめる", onPress: () => {} },
            { icon: "trash", label: "長押しで削除", variant: "warn", hold: true, onPress: () => void remove() },
          ]}
          onClose={() => setConfirmDelete(false)}
        />
      </div>
    </div>
  );
}

export { ThoughtModal };
