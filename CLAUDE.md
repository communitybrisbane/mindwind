# MindWind

新卒社会人・学生向けの AI メンターアプリ。日記を記録し、過去の自分の記録（RAG）をもとに相談できる。「あなたが自分のメンターになる」がコンセプト。UI は新 UI v5（革の机・紙・鉛筆・緑インクの世界観、気分の玉、週の手紙）。

## ドキュメント（実装前に必ず参照）

- `docs/AI-CONSTITUTION.md` — **AI に関する最高規範**。すべてのプロンプト・機能・モデル変更はこれに従う。矛盾する変更は憲法改正（ユーザー承認必須）が先
- `docs/ARCHITECTURE.md` — 技術設計の正。モデル選定（深掘り=Haiku 4.5／検索用メタ=Haiku 4.5／相談=Opus 4.8／週の手紙=Opus 4.8）、データモデル、フロー、レート制限
- `docs/DESIGN-mindwind.md` — UI/UX 仕様の正。基準フレーム 390×844
- `docs/prototype/ui-v5.html` — **新 UI の見た目と動きの正**（ブラウザで開くと触れる。食い違ったらこちらが正）
- `docs/IMPLEMENTATION-CONTRACT.md` — 名前・型・API・ファイルの持ち主の正
- `docs/mentor-prompt.md` — AI メンターの人格・プロンプト実文（本番）。背景調査はローカルの `docs/dena-research.md`（コミット対象外）
- `docs/PLAN.md` — 実装計画（1タスク=1コミット。着手前に確認し、完了したらチェックを付ける）。進み具合の正
- `docs/HANDOFF-ui-v5.md` — 引き継ぎ（できたこと・ユーザー作業・既知の問題）
- `docs/SECURITY-SETUP.md`・`docs/OPS-*.md` — ボット対策の設定と運用手順（移行・ゲストの掃除・定着率）

## AI 呼び出しの鉄則

- **システムプロンプトは `docs/mentor-prompt.md`「メンタープロンプト（実文・コピーして使用）」を一字も変えずに使う**こと。共通部＋機能別追記（深掘り/検索用メタ/相談/週の手紙）の構成。勝手に文面を書き起こさない・要約しない。コードとの一致は `lib/ai/mentorPrompt.test.ts` が守る
- `{{profile}}` のみユーザーごとに差し込む（未入力項目は文に含めない。全未設定ならセクションごと省略）
- プロンプトは prompt caching の固定プレフィックス。可変部分（RAG 記録・新しい質問）は必ず messages の末尾に置く
- 文面を変更したいときはコードではなく `docs/mentor-prompt.md` を先に更新する（ドキュメントが正）

## 開発コマンド

```bash
npm run dev      # 開発サーバー（localhost:3000）
npm run build    # 本番ビルド
npm run test     # Vitest（lib/ 配下の *.test.ts）
npm run lint     # ESLint
```

## ディレクトリ構成（この方針から外れない）

```
app/          # Next.js App Router（ページ: / onboarding mood settings letter privacy terms と 3 タブ〔(tabs)/home・record・search〕、API Routes: app/api/、ボット対策は proxy.ts）
components/   # UI コンポーネント（画面横断: チャットバブル・入力バー・タブバー・モーダルなど）
lib/          # ロジック（テスト対象）
  ├── ai/     # Claude/OpenAI 呼び出し（プロンプト組み立て・Structured Outputs スキーマ）
  ├── db/     # Firestore アクセス（thoughts / chunks / moods / letters / chats / profile / usage）
  └── logic/  # 純粋ロジック（コサイン類似度・ストリーク計算・Asia/Tokyo 日付境界）
```

## テストとセキュリティ

- テストは `lib/` のロジックのみ Vitest で書く。UI の細部はテストで縛らない（DEVELOPMENT.md 準拠）
- API キー（Anthropic / OpenAI / Firebase Admin）はサーバー側のみ。クライアントに露出させない。`.env.local` はコミットしない

## モックの扱い

**`mockups/` は旧 UI の凍結モックで、新 UI の正ではない。更新しない**。新 UI の正は `docs/prototype/ui-v5.html`。画面の仕様を変えるときは、プロトタイプと `docs/DESIGN-mindwind.md` を直す（直したあと全画面を開いて確かめる）。完成時に実アプリのスクリーンショットで `mockups/` を置き換える予定。


## 主要な設計判断（変更時はユーザーに確認）

- 記録フロー：日記 → 深掘り（1問・スキップ可）→ 保存。**成形カード（6項目）は廃止**。本人の文章は一字も変えずに保存し、画面にも AI への入力にもそのまま使う。裏で本人の文章をチャンクに分け（`chunks`）、検索用の1行メタ（画面にも回答にも出さない）を付けて embedding を作る
- 一言の記録（`kind: "quick"`、2〜60字）は気分の玉を選ぶと書ける。あとから深掘りの1問を足せる
- 起動：スプラッシュ → 気分の回転盤（1日の最初に1回）→ ホーム。ログインなしで始まる（自動ゲスト＝匿名ログイン）。Google 連携は設定から（`linkWithPopup`・同じ uid でデータを引き継ぐ）。ゲストの限度は会員の 1/10
- 気分は5段階（追い風・そよ風・凪・向かい風・嵐）。選ぶと風の演出が出る。自動の呼び名は風にまつわる9種で、AI には渡さない
- 週の手紙：開いたときに生成（`letters/{weekKey}`・Opus 4.8・本人の言葉の引用はサーバーが部分文字列かを検証）。今週3日以上の記録が条件
- 記録の限度は会員30件/日・ゲスト3件/日。`lib/logic/limits.ts` で一元管理。保存後の編集は共通モーダルから可能（PUT で再チャンク・再ベクトル化）
- 相談：スレッド式チャット（履歴保持・スレッド間で文脈を混ぜない・会話は RAG に入れない）。30メッセージ/日。AI に渡すのは本人の言葉のチャンクと日付だけ
- 危機の言葉は、AI を通らない経路（一言・保存）でもコードで判定し、窓口（いのちの電話・よりそいホットライン）を案内する（憲法第8条）
- ボット対策：App Check（reCAPTCHA Enterprise）と IP レート制限（Upstash）を `proxy.ts` で。`ENFORCE_APP_CHECK` は monitor→enforce の段階
- タイムゾーンは Asia/Tokyo 固定
