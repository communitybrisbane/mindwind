"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import EditThoughtModal from "@/components/EditThoughtModal";
import FairCopy from "@/components/FairCopy";
import MentorNote from "@/components/MentorNote";
import RecordHeader from "@/components/RecordHeader";
import RecordToolTray from "@/components/RecordToolTray";
import SavedRecordChips from "@/components/SavedRecordChips";
import { MAX_DIARY_LENGTH } from "@/lib/logic/limits";
import { useRecordSession } from "./useRecordSession";

/** ?date= の読み取りに useSearchParams が必要なため Suspense で包み、
 * 日付切替（過去日 ⇄ 今日）で key を変えて書きかけの状態を確実にリセットする */
export default function RecordPage() {
  return (
    <Suspense>
      <RecordPageBody />
    </Suspense>
  );
}

function RecordPageBody() {
  const dateParam = useSearchParams().get("date");
  return <RecordSession key={dateParam ?? "today"} dateParam={dateParam} />;
}

function RecordSession({ dateParam }: { dateParam: string | null }) {
  const s = useRecordSession(dateParam);
  const {
    phase, cards, diaryText, deepDiveQuestion, deepDiveAnswer, gentleNote, setGentleNote,
    shaped, setShaped, streamingShaped, recording, sending, saving, error, setError,
    editing, setEditing, editSaving, editError, setEditError, scrollRef, pageWord,
    skipDeepDive, saveEdit, deleteRecord, inputDisabled, setActiveInput, displayValue,
  } = s;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [scrollRef, phase, shaped, sending, streamingShaped, gentleNote]);

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#f7f4ec]">
      <RecordHeader phase={phase} heading={s.heading} targetDate={s.targetDate} pageWord={s.pageWord} />
      {/* ノートのページ（罫線はこのコンテナの背景。中の文字はすべて行送り34px） */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="notebook-paper min-h-full pl-[46px] pr-6">
          {/* 保存済み記録のしおり */}
          <SavedRecordChips
            records={cards}
            onDelete={(id) => void deleteRecord(id)}
            onEdit={(thoughtId, shaped) => {
              setEditError("");
              setEditing({ thoughtId, shaped });
            }}
          />

          {/* 送信済みの日記本文（深掘り以降はページに固定） */}
          {phase >= 2 && (
            <p className="whitespace-pre-wrap font-serif text-base leading-[34px] text-ink">
              {diaryText}
            </p>
          )}

          {/* 短文のうながし・言い換えのお願い */}
          {gentleNote && <MentorNote text={gentleNote} />}

          {/* 深掘り：メンターの書き込み＋続きの罫線に回答を書く。
              清書フェーズでも質問と回答はページに残す（スキップした場合は質問ごと畳む） */}
          {deepDiveQuestion && (phase === 2 || (phase === 3 && deepDiveAnswer)) && (
            <MentorNote
              text={deepDiveQuestion}
              sig="メンターの書き込み"
              onSkip={phase === 2 && !sending ? skipDeepDive : undefined}
            />
          )}
          {phase === 3 && deepDiveAnswer && (
            <p className="whitespace-pre-wrap font-serif text-base leading-[34px] text-ink">
              {deepDiveAnswer}
            </p>
          )}

          {(phase === 1 || phase === 2) && (
            <AutoGrowTextarea
              value={displayValue}
              onChange={(text) => {
                setActiveInput(text.slice(0, MAX_DIARY_LENGTH));
                if (gentleNote) setGentleNote("");
              }}
              readOnly={inputDisabled}
              placeholder={
                recording
                  ? "聞き取り中…話してみて"
                  : phase === 1
                    ? `${pageWord}は何があった？ 思いつくままに…`
                    : "ここに続きを書いてね…"
              }
              className="min-h-[170px] bg-transparent font-serif text-base leading-[34px] text-ink placeholder:text-ink-tertiary focus:outline-none"
            />
          )}

          {/* 成形を待つあいだの書き込み */}
          {sending && phase === 3 && !streamingShaped && (
            <p className="animate-pulse pl-[26px] font-serif text-[14.5px] leading-[34px] text-accent">
              清書しているよ…
            </p>
          )}

          {/* 清書（ストリーミング中→部分表示、完成後→編集可） */}
          {streamingShaped && !shaped && <FairCopy value={streamingShaped} />}
          {shaped && <FairCopy value={shaped} editable onChange={setShaped} />}

          {/* 赤インクの書き込み（エラー） */}
          {error && (
            <p className="font-serif text-[14px] leading-[34px] text-error">
              ※ {error}
              <button
                type="button"
                aria-label="エラーを閉じる"
                onClick={() => setError("")}
                className="ml-2 font-sans text-[12px] underline"
              >
                閉じる
              </button>
            </p>
          )}
          {saving && (
            <p className="font-serif text-[14px] leading-[34px] text-ink-secondary">保存中…</p>
          )}
        </div>
      </div>

      {editing && (
        <EditThoughtModal
          initial={editing.shaped}
          saving={editSaving}
          error={editError}
          onClose={() => setEditing(null)}
          onSave={(shaped) => void saveEdit(shaped)}
        />
      )}

      <RecordToolTray
        phase={phase}
        isGuest={s.user?.isGuest ?? false}
        limitReached={s.limitReached}
        dailyLimit={s.dailyLimit}
        micError={s.micError}
        inputDisabled={s.inputDisabled}
        doneDisabled={s.doneDisabled}
        setActiveInput={s.setActiveInput}
        onInterim={s.setInterim}
        onRecordingChange={(r) => {
          s.setRecording(r);
          if (r) s.setMicError(false);
        }}
        onMicError={() => s.setMicError(true)}
        onDone={s.done}
      />
    </main>
  );
}
