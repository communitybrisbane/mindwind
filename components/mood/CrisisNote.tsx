"use client";

// 記録の危機対応（PLAN 85・憲法第8条）。保存・編集のあと、サーバーが crisis: true を返したときに出す紙のモーダル。
// 一言の画面・記録タブ・保存済みの記録のモーダル（編集・あとから深掘り）で共通。
// 共感の一言と、相談窓口（いのちの電話・よりそいホットライン）を案内する。診断・病名は言わない。
// 本人の文章は引用も言い換えもしない。丸いボタンを押すと onDone（一言・記録タブはホームへ、モーダルはとじる）。
// 案内を読み逃さないよう、幕のタップや Esc では閉じない。
// 文言は固定（AI は通らない）。窓口の番号は lib/logic/crisis.ts の HOTLINES（docs/mentor-prompt.md 共通部「セーフティ」と同じ）。

import { useCallback, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { IconName } from "@/components/ui/Icon";
import { HOTLINES } from "@/lib/logic/crisis";
import styles from "./mood.module.css";

export { HOTLINES };

const noop = () => {};

export type CrisisNoteProps = {
  open: boolean;
  /** 閉じたあとに1回だけ呼ぶ（ホームへ進む・とじる） */
  onDone: () => void;
  /** ボタンの文字と絵（既定：「ホームへ」・矢印） */
  doneLabel?: string;
  doneIcon?: IconName;
};

export function CrisisNote({ open, onDone, doneLabel = "ホームへ", doneIcon = "arrow" }: CrisisNoteProps) {
  // 二度押しでホームへ2回進まないように1回にまとめる
  const doneRef = useRef(false);
  // 開き直したら（モーダルの中で2回目の編集など）またボタンが効くようにする
  useEffect(() => {
    if (open) doneRef.current = false;
  }, [open]);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  return (
    <Dialog
      open={open}
      title="書いてくれて、ありがとう"
      text={
        <div className={styles.crisisText}>
          <p>いま、とてもしんどい気持ちを抱えているのかもしれないね。ひとりで抱えなくていいよ。</p>
          <p>話を聞いてくれる人がいるから、よかったら電話してみて。</p>
          <ul className={styles.crisisLines}>
            {HOTLINES.map((h) => (
              <li key={h.tel}>
                <span className={styles.crisisName}>{h.name}</span>
                <a className={styles.crisisTel} href={`tel:${h.tel.replace(/-/g, "")}`}>
                  {h.tel}
                </a>
              </li>
            ))}
          </ul>
        </div>
      }
      buttons={[{ icon: doneIcon, label: doneLabel, variant: "green", onPress: finish }]}
      onClose={noop}
    />
  );
}

export default CrisisNote;
