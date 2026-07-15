import Link from "next/link";

export const metadata = { title: "利用規約 | MindWind" };

const sections: { heading: string; body: string }[] = [
  {
    heading: "1. サービスの内容",
    body: "MindWind（以下「本サービス」）は、日記の記録と、過去の記録をもとにした AI との相談機能を提供する個人向けサービスです。本サービスは開発中のベータ版であり、予告なく機能の変更・停止を行うことがあります。",
  },
  {
    heading: "2. アカウント",
    body: "本サービスの利用には Google アカウントでのログインが必要です。アカウントの管理はユーザー自身の責任で行ってください。",
  },
  {
    heading: "3. AI が生成する内容について",
    body: "相談機能の回答や記録の整理結果は AI が生成するものであり、正確性・有用性を保証するものではありません。医療・法律等の専門的な判断が必要な場合は、専門家に相談してください。",
  },
  {
    heading: "4. 禁止事項",
    body: "本サービスの不正利用、リバースエンジニアリング、第三者の権利を侵害する内容の投稿、本来の目的（自己の記録と相談）から逸脱した利用を禁止します。",
  },
  {
    heading: "5. 免責",
    body: "本サービスの利用により生じた損害について、運営者は故意または重過失による場合を除き責任を負いません。",
  },
  {
    heading: "6. 規約の変更",
    body: "本規約は必要に応じて変更されることがあります。重要な変更がある場合はアプリ内で告知します。",
  },
];

export default function TermsPage() {
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <h1 className="text-xl font-semibold text-primary">利用規約</h1>
      <div className="mt-5 flex flex-col gap-5">
        {sections.map(({ heading, body }) => (
          <section key={heading}>
            <h2 className="text-sm font-semibold text-ink">{heading}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{body}</p>
          </section>
        ))}
      </div>
      <Link href="/" className="mt-8 inline-block text-sm text-accent underline">
        戻る
      </Link>
    </main>
  );
}
