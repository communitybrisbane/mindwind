"use client";

// 一言の危機対応（PLAN 85・憲法第8条）。保存のあと、サーバーが crisis: true を返したときに出す紙のモーダル。
// 共感の一言と、相談窓口（いのちの電話・よりそいホットライン）を案内する。診断・病名は言わない。
// 本人の一言は引用も言い換えもしない。丸いボタンを押すとホームへ進む（onDone）。
// 案内を読み逃さないよう、幕のタップや Esc では閉じない。
// 文言は固定（AI は通らない）。窓口の番号は docs/mentor-prompt.md 共通部「セーフティ」と同じ。

import { useCallback, useRef } from "react";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./mood.module.css";

export const HOTLINES = [
  { name: "いのちの電話", tel: "0570-783-556" },
  { name: "よりそいホットライン", tel: "0120-279-338" },
] as const;

const noop = () => {};

export type CrisisNoteProps = {
  open: boolean;
  /** 閉じたあとに1回だけ呼ぶ（ホームへ進む） */
  onDone: () => void;
};

export function CrisisNote({ open, onDone }: CrisisNoteProps) {
  // 二度押しでホームへ2回進まないように1回にまとめる
  const doneRef = useRef(false);
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
      buttons={[{ icon: "arrow", label: "ホームへ", variant: "green", onPress: finish }]}
      onClose={noop}
    />
  );
}

export default CrisisNote;
