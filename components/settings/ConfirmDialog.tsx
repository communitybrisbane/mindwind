"use client";

// 設定画面の確認ダイアログ（PLAN 49・50）。紙のダイアログ（components/ui/Dialog）に、
// プロトタイプ ui-v5 の #rowOut / #rowDel / gsheet（使用中）の文言を載せる。

import { useState, type ReactNode } from "react";
import { Dialog, type DialogButton } from "@/components/ui/Dialog";
import { conflictAccountLabel, type SettingsDialogKind } from "@/lib/auth/link";

export type ConfirmDialogProps = {
  /** 出すダイアログ（null で閉じる） */
  kind: SettingsDialogKind | null;
  /** 使用中のアカウントのメール（kind="conflict"） */
  conflictEmail?: string | null;
  /** 削除の前に Google の本人確認をするか（kind="delete"） */
  linked?: boolean;
  onClose: () => void;
  /** ゲストのログアウト警告の「つなぐ」 */
  onLink: () => void;
  onLogout: () => void;
  onDelete: () => void;
  onRelogin: () => void;
  /** 本人確認（ポップアップがブロックされたときのやり直し。タップで開く） */
  onReauth: () => void;
};

const cancel: DialogButton = { icon: "arrowL", label: "やめる", variant: "ink", onPress: () => {} };

export default function ConfirmDialog({
  kind,
  conflictEmail,
  linked = false,
  onClose,
  onLink,
  onLogout,
  onDelete,
  onRelogin,
  onReauth,
}: ConfirmDialogProps) {
  // 閉じるとき（kind=null）も、消えていくあいだは直前の中身を見せる
  const [shown, setShown] = useState<SettingsDialogKind | null>(kind);
  if (kind !== null && kind !== shown) setShown(kind);

  let title = "";
  let text: ReactNode = null;
  let buttons: DialogButton[] = [cancel];

  switch (kind ?? shown) {
    case "logoutGuest":
      title = "ログアウトしますか？";
      text = (
        <>
          ゲストのまま出ると、<b>この記録には戻れなくなります</b>。残したいときは、先にGoogleでつないでください。
        </>
      );
      buttons = [
        cancel,
        { icon: "shield", label: "つなぐ", variant: "green", onPress: onLink },
        { icon: "exit", label: "ログアウト", variant: "warn", onPress: onLogout },
      ];
      break;
    case "logoutLinked":
      title = "ログアウトしますか？";
      text = "また「Googleでデータを守る」から、同じアカウントで戻れます。記録は消えません。";
      buttons = [cancel, { icon: "exit", label: "ログアウト", variant: "green", onPress: onLogout }];
      break;
    case "delete":
      title = "アカウントを削除しますか？";
      text = (
        <>
          日記・相談・手紙・気分を、<b>すべて完全に消します</b>。元に戻せません。
          {linked && (
            <>
              <br />
              （先にGoogleで本人確認をします）
            </>
          )}
          <br />
          <br />
          消すときは、右の赤いボタンを<b>長押し</b>します。
        </>
      );
      buttons = [
        cancel,
        { icon: "trash", label: "長押しで削除", variant: "warn", hold: true, onPress: onDelete },
      ];
      break;
    case "reauth":
      title = "Googleで本人確認";
      text = (
        <>
          削除の前に、本人確認をします。下のボタンを押すと、Googleの画面が開きます。
          <br />
          確認がすむと、<b>すべて完全に消えます</b>。
        </>
      );
      buttons = [cancel, { icon: "check", label: "本人確認", variant: "warn", onPress: onReauth }];
      break;
    case "conflict":
      title = "このGoogleアカウントは使用中です";
      text = (
        <>
          {conflictAccountLabel(conflictEmail)}は、すでに MindWind で使われています。
          <br />
          そのアカウントでログインし直すこともできますが、<b>いまのゲストの記録は引き継げません</b>（消えます）。
        </>
      );
      buttons = [cancel, { icon: "check", label: "ログインし直す", variant: "warn", onPress: onRelogin }];
      break;
    default:
      break;
  }

  return (
    <Dialog open={kind !== null} title={title} text={text} buttons={buttons} onClose={onClose} />
  );
}

export { ConfirmDialog };
