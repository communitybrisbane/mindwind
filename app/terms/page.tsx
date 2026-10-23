import Link from "next/link";
import { Desk } from "@/components/ui/Desk";
import { Paper } from "@/components/ui/Paper";
import Icon from "@/components/ui/Icon";

export const metadata = { title: "利用規約 | MindWind" };

const sections: { heading: string; body: string }[] = [
  {
    heading: "1. サービスの内容",
    body: "MindWind（以下「本サービス」）は、日記の記録と、過去の記録をもとにした AI との相談機能を提供する個人向けサービスです。本サービスは開発中のベータ版であり、予告なく機能の変更・停止を行うことがあります。",
  },
  {
    heading: "2. アカウント",
    body: "本サービスはゲスト（この端末のブラウザだけで使う状態）として始められます。Google アカウントとつなぐと、記録をそのまま引き継いで、どの端末からでも続けられます。ゲストのまま30日使わないと、記録は削除されます。アカウントの管理はユーザー自身の責任で行ってください。",
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
    <Desk className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-none px-6 pt-[58px]">
        <div className="mincho text-[12.5px] tracking-[0.16em] text-cream/60">MindWind</div>
        <h1 className="mincho mt-1.5 text-[25px] tracking-[0.03em] text-cream">利用規約</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[150px] pt-5">
        <Paper as="article" rotate={-0.4} className="px-[22px] pb-6 pt-[22px]">
          <div className="flex flex-col gap-5">
            {sections.map(({ heading, body }) => (
              <section key={heading}>
                <h2 className="mincho text-[15px] font-medium text-graphite">{heading}</h2>
                <p className="hand mt-1.5 text-[15px] leading-[1.85] text-[#2c2a26]">{body}</p>
              </section>
            ))}
          </div>
        </Paper>
      </div>
      {/* もどる（親指の弧・左下の丸いボタン） */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-b from-transparent to-[rgba(29,41,29,0.88)]">
        <Link
          href="/settings"
          aria-label="もどる"
          className="pointer-events-auto absolute left-[26px] top-[34px] flex h-16 w-16 items-center justify-center rounded-full border-[1.8px] border-dashed border-cream/50 bg-cream/[0.07] text-[28px] text-cream/90 active:scale-[0.92]"
        >
          <Icon name="arrowL" />
        </Link>
      </div>
    </Desk>
  );
}
