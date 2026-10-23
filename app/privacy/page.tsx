import Link from "next/link";
import { Desk } from "@/components/ui/Desk";
import { Paper } from "@/components/ui/Paper";
import Icon from "@/components/ui/Icon";

export const metadata = { title: "プライバシーポリシー | MindWind" };

const sections: { heading: string; body: string }[] = [
  {
    heading: "1. 取得する情報",
    body: "Google アカウントとつないだ場合のアカウント情報（メールアドレス等）、ユーザーが入力する呼び名・日記・気分・相談内容、およびそれらから生成される記録データを取得します。ゲストの場合、メールアドレスは取得しません。",
  },
  {
    heading: "2. 利用目的",
    body: "取得した情報は、本サービスの提供（記録の保存・整理、過去の記録にもとづく相談への回答）のためにのみ利用します。広告目的での利用や第三者への販売は行いません。",
  },
  {
    heading: "3. AI サービスへの送信",
    body: "日記や相談の内容は、記録の整理・回答の生成のために AI サービス（Anthropic / OpenAI）へ送信されます。これらの API に送信されたデータは AI モデルの学習には使用されません。相談の会話は、あなたの記録（過去の記録としての検索の対象）には入れません。",
  },
  {
    heading: "4. 音声入力について",
    body: "音声入力を使用した場合、音声はお使いのブラウザの音声認識サービス（例：Google の音声認識）に送信され、テキストに変換されます。変換後のテキストのみが本サービスに保存されます。音声を使いたくない場合はキーボード入力のみで利用できます。",
  },
  {
    heading: "5. データの保管と削除",
    body: "データは Google Cloud（Firebase）上に保管されます。記録・相談履歴は個別に削除でき、アカウントを削除するとすべてのデータが完全に削除されます。ゲストのまま30日使わない場合も、記録は削除されます。Google アカウントとつなぐと、ゲストの記録はそのまま引き継がれます。",
  },
  {
    heading: "6. ポリシーの変更",
    body: "本ポリシーは必要に応じて変更されることがあります。重要な変更がある場合はアプリ内で告知します。",
  },
];

export default function PrivacyPage() {
  return (
    <Desk className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-none px-6 pt-[58px]">
        <div className="mincho text-[12.5px] tracking-[0.16em] text-cream/60">MindWind</div>
        <h1 className="mincho mt-1.5 text-[25px] tracking-[0.03em] text-cream">プライバシーポリシー</h1>
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
