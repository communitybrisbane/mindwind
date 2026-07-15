import Link from "next/link";

export const metadata = { title: "プライバシーポリシー | MindWind" };

const sections: { heading: string; body: string }[] = [
  {
    heading: "1. 取得する情報",
    body: "Google ログインに伴うアカウント情報（メールアドレス等）、ユーザーが入力するプロフィール・日記・相談内容、およびそれらから生成される記録データを取得します。",
  },
  {
    heading: "2. 利用目的",
    body: "取得した情報は、本サービスの提供（記録の保存・整理、過去の記録にもとづく相談への回答）のためにのみ利用します。広告目的での利用や第三者への販売は行いません。",
  },
  {
    heading: "3. AI サービスへの送信",
    body: "日記や相談の内容は、記録の整理・回答の生成のために AI サービス（Anthropic / OpenAI）へ送信されます。これらの API に送信されたデータは AI モデルの学習には使用されません。",
  },
  {
    heading: "4. 音声入力について",
    body: "音声入力を使用した場合、音声はお使いのブラウザの音声認識サービス（例：Google の音声認識）に送信され、テキストに変換されます。変換後のテキストのみが本サービスに保存されます。音声を使いたくない場合はキーボード入力のみで利用できます。",
  },
  {
    heading: "5. データの保管と削除",
    body: "データは Google Cloud（Firebase）上に保管されます。記録・相談履歴は個別に削除でき、アカウントを削除するとすべてのデータが完全に削除されます。",
  },
  {
    heading: "6. ポリシーの変更",
    body: "本ポリシーは必要に応じて変更されることがあります。重要な変更がある場合はアプリ内で告知します。",
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <h1 className="text-xl font-semibold text-primary">プライバシーポリシー</h1>
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
