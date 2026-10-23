"use client";

// 過去の手紙の一覧（下から出る紙）。開く・消す（完全削除。長押しの確認つき）。
// GET /api/letters が無い（生成 API 77 が未実装）間は「まだ手紙はないよ」。

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import { showToast } from "@/components/ui/Toast";
import type { LetterSummary } from "@/lib/db/types";
import { useLetterList } from "@/lib/db/useLetter";
import styles from "./letter.module.css";

function md(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return m && d ? `${m}/${d}` : key;
}

export default function LetterList({
  open,
  currentWeek,
  onClose,
  onOpen,
  onDeleted,
}: {
  open: boolean;
  /** いま開いている手紙の週（一覧で「いま読んでいる」と添える） */
  currentWeek: string | null;
  onClose: () => void;
  onOpen: (weekKey: string) => void;
  onDeleted: (weekKey: string) => void;
}) {
  const { letters, remove } = useLetterList(open);
  const [target, setTarget] = useState<LetterSummary | null>(null);

  const doDelete = async (l: LetterSummary) => {
    const ok = await remove(l.weekKey);
    if (!ok) {
      showToast("消せなかった。少しあとで、もう一度ためしてね");
      return;
    }
    showToast("手紙を消したよ。");
    onDeleted(l.weekKey);
  };

  return (
    <>
      <div
        className={`${styles.veil} ${open ? styles.show : ""}`}
        onClick={onClose}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.shelfWrap} onClick={(e) => e.stopPropagation()}>
        <Paper as="section" className={styles.shelf} aria-label="過去の手紙">
          <h2 className={styles.shelfTitle}>過去の手紙</h2>
          {letters === null ? (
            <p className={styles.empty}>…</p>
          ) : letters.length === 0 ? (
            <p className={styles.empty}>まだ手紙はないよ</p>
          ) : (
            <ul className={styles.shelfList}>
              {letters.map((l) => (
                <li key={l.weekKey} className={styles.row}>
                  <button type="button" className={styles.rowOpen} onClick={() => onOpen(l.weekKey)}>
                    <span className={styles.rowEnv} aria-hidden="true">
                      <Icon name="env" />
                      {!l.readAt && <b className={styles.rowDot} />}
                    </span>
                    <span className={styles.rowText}>
                      <b>
                        {md(l.from)}〜{md(l.to)}
                        {l.weekKey === currentWeek && <span className={styles.rowCurrent}>いま読んでいる</span>}
                      </b>
                      <span>この週は{l.recordDays}日、書いてくれた</span>
                    </span>
                  </button>
                  <RoundButton
                    variant="ink"
                    icon="trash"
                    aria-label={`${md(l.from)}〜${md(l.to)}の手紙を消す`}
                    onClick={() => setTarget(l)}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className={styles.shelfClose}>
            <RoundButton variant="ink" icon="check" label="とじる" aria-label="一覧をとじる" onClick={onClose} />
          </div>
        </Paper>
        </div>
      </div>
      <Dialog
        open={target !== null}
        title="この手紙を消しますか？"
        text="消した手紙は、もとに戻せません。引用していた記録は消えません。"
        onClose={() => setTarget(null)}
        buttons={[
          { icon: "undo", label: "やめる", onPress: () => setTarget(null) },
          {
            icon: "trash",
            label: "長押しで消す",
            variant: "warn",
            hold: true,
            onPress: () => {
              const l = target;
              setTarget(null);
              if (l) void doDelete(l);
            },
          },
        ]}
      />
    </>
  );
}
