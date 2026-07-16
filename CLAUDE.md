# MindWind

新卒社会人・学生向けの AI メンターアプリ。日記を記録し、過去の自分の記録（RAG）をもとに相談できる。「あなたが自分のメンターになる」がコンセプト。

## ドキュメント（実装前に必ず参照）

- `docs/AI-CONSTITUTION.md` — **AI に関する最高規範**。すべてのプロンプト・機能・モデル変更はこれに従う。矛盾する変更は憲法改正（ユーザー承認必須）が先
- `docs/ARCHITECTURE.md` — 技術設計の正。モデル選定（深掘り=Haiku 4.5／成形=Sonnet 5＋Structured Outputs／相談=Opus 4.8）、データモデル、フロー、レート制限
- `docs/DESIGN-mindwind.md` — UI/UX 仕様の正。基準フレーム 390×844
- `docs/mentor-prompt.md` — AI メンターの人格・プロンプト実文（本番）。背景調査はローカルの `docs/dena-research.md`（コミット対象外）
- `mockups/mockup.html` — 全13画面のモック（画面変更時はここを更新してスクリーンショットを撮り直す）
- `docs/PLAN.md` — 実装計画（1タスク=1コミット。着手前に確認し、完了したらチェックを付ける）

## AI 呼び出しの鉄則

- **システムプロンプトは `docs/mentor-prompt.md`「メンタープロンプト（実文・コピーして使用）」を一字も変えずに使う**こと。共通部＋機能別追記（深掘り/成形/相談）の構成。勝手に文面を書き起こさない・要約しない
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
app/          # Next.js App Router（ページ: / onboarding home record search terms privacy、API Routes: app/api/）
components/   # UI コンポーネント（画面横断: チャットバブル・入力バー・タブバー・モーダルなど）
lib/          # ロジック（テスト対象）
  ├── ai/     # Claude/OpenAI 呼び出し（プロンプト組み立て・Structured Outputs スキーマ）
  ├── db/     # Firestore アクセス（thoughts / chats / profile / recordChat）
  └── logic/  # 純粋ロジック（コサイン類似度・ストリーク計算・Asia/Tokyo 日付境界）
```

## テストとセキュリティ

- テストは `lib/` のロジックのみ Vitest で書く。UI の細部はテストで縛らない（DEVELOPMENT.md 準拠）
- API キー（Anthropic / OpenAI / Firebase Admin）はサーバー側のみ。クライアントに露出させない。`.env.local` はコミットしない

## モックの扱い

**モック（`mockups/`）は凍結中。実装中の画面変更でモックを更新しない**（実装が正）。完成時に実アプリのスクリーンショットで置き換える予定。仕様の記録は `docs/DESIGN-mindwind.md` の更新のみ行う。

<details>
<summary>（参考）凍結解除後のモック更新手順</summary>

1. `mockups/mockup.html` を編集（全13画面が1ファイルに入っている。フレームは 390×844）
2. `cd mockups && python3 -m http.server 8931` でローカル配信
3. Playwright MCP で `http://localhost:8931/mockup.html` を開き、該当フレーム（`#record1` など）を `browser_take_screenshot`（type: png, scale: device）で撮影
4. 撮った PNG を `mockups/` の既存ファイル名に上書き（例：`03-record-input.png`）し、サーバーを停止

</details>

## 主要な設計判断（変更時はユーザーに確認）

- 記録フロー：日記 → 深掘り（1問・スキップ可）→ 成形（6項目＋タイトル、チャット内カードで編集）→ 保存でホームへ
- 記録は実質無制限（安全上限：会員30件/日・ゲスト3件/日。`lib/logic/limits.ts` で一元管理）。保存後の編集はなし（削除→書き直し）
- 相談：スレッド式チャット（履歴保持・スレッド間で文脈を混ぜない・会話は RAG に入れない）。30メッセージ/日
- タイムゾーンは Asia/Tokyo 固定
