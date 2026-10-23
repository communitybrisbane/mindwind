import { redirect } from "next/navigation";

// 旧オンボーディング（プロフィール入力）は廃止。呼び名・アカウント操作は設定画面へ移した（PLAN 48・49）。
// 旧リンク・ブックマーク（?edit=1 を含む）の救済として /settings へ送るだけ。
export default function OnboardingPage(): never {
  redirect("/settings");
}
