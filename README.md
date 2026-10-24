# MindWind - あなたが自分のメンター

**▶ 使ってみる: https://mindwind.days-count.com**（アプリを開くとログインなしで始まります。記録を守りたくなったら、設定から Google と連携できます。スマホなら「ホーム画面に追加」でアプリとして使えます）

調子がいい時、結果が出ている時、そのマインドと行動を記録しておく。調子が悪い時、結果が出ていない時、その記録を見て再現する。つまり、**あなたが自分のメンターになる。**

## ペルソナ

**新卒社会人で、メンターにはずれ、自分が客観視できない人**

- 配属直後、判断基準がない
- 頼れるメンターがいない、または悪いメンターに当たった
- ミスを繰り返しているが、原因が分からない
- 自分の考えが正しいのか不安
- 「日記を書いて整理してみたい」と考えている人

## 問題と解決

### 問題：メンターのアドバイスが的確ではなく、悩みが解決されない

- メンターのアドバイスをもらったけど、自分の状況に合わなかった
- 相談しても「頑張れ」とか抽象的なアドバイスで悩みが解決しない
- 誰にも相談できない立場にいて、判断基準がない
- メンター自身が経験していないことについてアドバイスをもらうから、ピンとこない
- 同じ悩みを何度も繰り返して、判断基準が定まらない

### 解決：すべての感情・経験から、自分のパターンを認識する

1. **すべての感情を記録** - うまくいった時も、つらい時も、失敗した時も
2. **パターンを認識** - 成功パターンと失敗パターンの両方が見える
3. **再現 or 回避** - うまくいったやり方は再現、失敗したやり方は避ける

## 使い方

### 毎日：気分を選んで、日記を書く（3分以内）

アプリを開くと、革の机の上に紙が置かれた画面で始まります。まず**気分の回転盤**をくるくる回して、今日の風を選びます（追い風・そよ風・凪・向かい風・嵐）。選ぶと、その風が画面に吹きます。

- **一言**：気分を選んだあと、一言だけ残して終えられます（60字まで）。
- **日記**：記録タブで、今日のことを音声またはテキストで自由に書きます。
  1. **日記** — 書いた文章は、そのまま保存されます。AI が書き換えることはありません
  2. **深掘り** — AI が1回だけ質問を返します（スキップ可）
  3. **保存** — 長押しで封をして、ホームに戻ります

裏では、本人の言葉を分けて検索できるようにしています（画面には出ません）。記録は実質無制限（安全上限あり）です。

### 週の終わりに：手紙が届く

その週に3日以上記録すると、メンターから**週の手紙**が届きます。あなた自身の言葉を引きながら、その週を振り返ります。封を開けたときに書かれる、週1通の手紙です。

### 迷った時：過去の自分に相談する

相談タブは ChatGPT のようなスレッド式チャット。質問すると AI があなたの記録をベクトル検索し、**過去のあなたの記録だけを根拠に** Yes/No の明確なアドバイスを返します。

```
「新しいプロジェクト、リーダーとして引き受けるべき？」

→ 「引き受けるべきだと思う。過去のあなたは、心に余裕がある状態で、
   まずメンバーと1対1で話してから全体をまとめるやり方で成功している。
   ただ、焦っている時のあなたは判断を誤りやすいから、
   始める前にスケジュールに余裕を作ることだけ意識してみて。」
   📎 参考にした記録 2件（タップで中身を確認できる）
```

追い質問で会話を続けられ、過去の相談は履歴から見返せます（スレッド間で文脈は混ざりません）。

### プロフィール（任意）

呼び名・いましていること・ステージ（学生〜社会人3年目以上）・目標を設定から登録すると、深掘りや相談があなたの立場を踏まえた内容になります。

## メリット

- **メンターに依存しない** - 悪いメンターの影響を受けない
- **外れメンターがない** - あなたの経験が100%正解
- **再現性が高い** - あなたのマインドと行動だから、同じ結果が出やすい
- **自信が出る** - 「自分はこの時はうまくいく」という根拠が明確
- **判断が早くなる** - 迷う時間が減る

## 画面

新 UI（v5）の見た目と動きは、[`docs/prototype/ui-v5.html`](docs/prototype/ui-v5.html) をブラウザで開くと触れます（基準フレーム 390×844）。実際の画面は上の「使ってみる」から確認できます。実アプリのスクリーンショットは、まだ用意していません。

[`mockups/`](mockups/) は**旧 UI**（成形カードがあった頃）の凍結モックで、現在の画面とは異なります。

## このアプリの工夫

コードと docs で確かめられるものだけを挙げます。

- **本人の文章を AI が書き換えない**：日記と深掘りの答えは、検証するだけで一字も変えずに保存します。テストで、前後の空白も含めて同じ文字列が保存されることを確かめています。 → `lib/logic/recordText.ts`・`recordText.test.ts`
- **本人の言葉を書き換えずに分けるチャンクの RAG**：文の境界で 200〜400 字目安に分け、連結すると元の本文に戻ることをテストしています。相談では、分けた言葉を日付つきで AI に渡します。 → `lib/logic/chunk.ts`・`chunk.test.ts`・`lib/ai/rag.ts`
- **憲法とプロンプトの一致をテストで守る**：`docs/mentor-prompt.md` の実文と `lib/ai/mentorPrompt.ts` の文面が、空白も含めて一致することをテストで確かめます。文面を変えたいときは先にドキュメントを直す決まりです。 → `lib/ai/mentorPrompt.test.ts`・`docs/AI-CONSTITUTION.md`
- **危機の言葉は AI を通さずコードで判定**：「死にたい」などの言葉をサーバーで見つけたら、AI を呼ばずに相談窓口を案内します（保存は成功させる）。週の手紙でも、その週に該当があれば引用を落とします。 → `lib/logic/crisis.ts`・`crisis.test.ts`・`lib/ai/letter.ts`
- **手紙の引用は部分文字列で検証**：AI が手紙に引いた言葉が、本人の記録の本文（日記か深掘りの答え）にそのまま含まれるときだけ残し、違えば落とします。 → `lib/ai/letter.ts`（`verifyQuote`）・`letter.test.ts`
- **ボット対策の二段構え**：`proxy.ts` が `/api/*` に、IP レート制限 → Firebase App Check の順で検証をかけます。未設定でも動く段階的な導入です。 → `proxy.ts`・`lib/api/rateLimit.ts`・`lib/api/appCheck.ts`・[`docs/SECURITY-SETUP.md`](docs/SECURITY-SETUP.md)
- **ブラウザから DB に直接つながない**：Firestore はルールで全拒否にし、API Routes が本人確認のうえ Admin SDK で読み書きします。 → `firestore.rules`
- **ログイン不要で始まる**：起動時に匿名ゲストになり、Google 連携でデータごと本登録に昇格します。 → `lib/auth/link.ts`

## 設計図

ER 図・画面遷移図・シーケンス図・データ遷移図・構成図・状態遷移図を Mermaid で描いています（コードで確かめた事実だけ）。一覧と見方は [`docs/diagrams/README.md`](docs/diagrams/README.md)。

- [`mindwind-diagrams.html`](docs/diagrams/mindwind-diagrams.html) — 全図を1ページにまとめたもの。ブラウザで開く
- [`er-firestore.md`](docs/diagrams/er-firestore.md) — Firestore のデータモデル
- [`arch-system.md`](docs/diagrams/arch-system.md) — システム全体の構成
- [`flow-data.md`](docs/diagrams/flow-data.md) — 本人の言葉がどこへ流れ、どこに出るか

## ディレクトリ構成

```
app/          Next.js App Router の画面（ホーム・記録・相談・手紙・設定ほか）と API Routes（app/api/）
components/   UI コンポーネント（気分・記録・相談・手紙・ホーム・設定・演出など、画面ごと）
lib/
  ├── ai/     Claude / OpenAI の呼び出し（プロンプト組み立て・手紙・検索用メタ・RAG）
  ├── api/    API の共通部（App Check・レート制限・NDJSON ストリーム・API の契約）
  ├── auth/   ゲストから Google への連携
  ├── db/     Firestore アクセス（Admin SDK・型・チャンク・手紙・気分）
  ├── logic/  純粋ロジック（チャンク分割・危機判定・類似度・日付境界・ストリーク ほか）
  └── ui/     画面側の小さな仕組み（下書き・フィードバック・演出）
proxy.ts      /api/* のレート制限と App Check
firestore.rules  クライアントからの直接アクセスを全拒否
scripts/      運用スクリプト（バックアップ・チャンク移行・ゲスト掃除・継続率）
docs/         設計・仕様・運用手順（地図は docs/README.md）
mockups/      旧 UI の凍結モック
```

## ドキュメントの地図

`docs/` の全ファイルの一覧と、読む順番（審査員向け・開発者向け・AI の仕様を知りたい人向け）は [`docs/README.md`](docs/README.md) にあります。

## セットアップ

```bash
git clone https://github.com/communitybrisbane/mindwind.git
cd mindwind
cp .env.example .env.local
npm install
npm run dev
# localhost:3000 で開く
```

### 環境変数

Firebase（クライアント + Admin SDK）、Claude API、OpenAI API の認証情報を `.env.local` に設定してください。詳細は [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) を参照。

## 技術スタック

- **フロントエンド**: Next.js 16（App Router）+ TypeScript + Tailwind CSS 4。PWA 対応（ホーム画面追加・スタンドアロン起動）
- **バックエンド**: Next.js API Routes + Firebase Admin SDK
- **AI**: Claude API — 深掘り質問・検索用メタ = Haiku 4.5 / 相談・週の手紙 = Opus 4.8（adaptive thinking・ストリーミング・prompt caching）
- **RAG**: OpenAI text-embedding-3-small ＋ Firestore のベクトル検索（`chunks`）で、本人の言葉のチャンクから過去記録の上位5件を探す
- **データ**: Firebase Firestore（東京リージョン）。ブラウザからの直接アクセスは `firestore.rules` で全拒否し、すべて API Routes（Admin SDK）経由
- **認証**: Firebase Authentication（起動時に自動で匿名ゲスト。設定から `linkWithPopup` で Google と連携すると、データごと本登録に昇格）
- **ボット対策**: Firebase App Check（reCAPTCHA Enterprise）＋ IP レート制限（Upstash Redis）。`proxy.ts` で検証（手順は [`docs/SECURITY-SETUP.md`](docs/SECURITY-SETUP.md)）
- **デプロイ**: Vercel（`git push` で自動デプロイ）＋独自ドメイン
- **テスト**: Vitest（47ファイル・491テスト。`lib/` のロジックと API の契約）

## 開発コマンド

```bash
npm run dev      # 開発サーバー
npm run test     # Vitest
npm run lint     # ESLint
npm run build    # 本番ビルド
npm run backup   # Firestore 全データをローカル JSON にバックアップ
```

運用スクリプト（`backfill-chunks`・`cleanup:guests`・`retention`）の手順は `docs/OPS-*.md` にあります。

---

## 詳細資料

- 技術設計 → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- UI/UX 仕様 → [`docs/DESIGN-mindwind.md`](docs/DESIGN-mindwind.md)
- AI の最高規範 → [`docs/AI-CONSTITUTION.md`](docs/AI-CONSTITUTION.md)
- 開発者向け情報 → [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- AI メンターの人格・プロンプト（本番） → [`docs/mentor-prompt.md`](docs/mentor-prompt.md)

---

**毎日の記録が、あなたの最高の相談役になる。**
