# MindWind - 開発者向けガイド

## セットアップ詳細

### 前提条件

- Node.js 18+
- Firebase プロジェクト（Firestore + Authentication で Google ログインを有効化）
- Anthropic API キー（Claude）
- OpenAI API キー（Embeddings）

### インストール手順

```bash
# リポジトリをクローン
git clone <repository>
cd mindwind

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local

# 開発サーバーを起動
npm run dev

# ブラウザで開く
open http://localhost:3000
```

### 環境変数の設定

```
# Firebase（クライアント）
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK（サーバー・API Routes 用）
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_service_account_private_key

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# OpenAI API（Embeddings）
OPENAI_API_KEY=your_openai_api_key

# ボット対策（任意。未設定でも動く。設定手順は docs/SECURITY-SETUP.md）
# App Check（PLAN 52）：reCAPTCHA Enterprise のサイトキー・開発用デバッグトークン・強制モード（off / monitor / enforce）
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=
NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN=
ENFORCE_APP_CHECK=off
# IP レート制限（PLAN 53）：Upstash Redis（未設定ならメモリで数える）。RATE_LIMIT_DISABLED=true で止める
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_DISABLED=
```

### 運用スクリプト（手動。既定はドライラン）

- `npm run backfill-chunks`（PLAN 59）：既存の `thoughts` からチャンクを作る移行。手順は `docs/OPS-backfill-chunks.md`
- `npm run cleanup:guests`（PLAN 54）：30日以上使われていないゲストを Auth と Firestore から消す。手順は `docs/OPS-guest-cleanup.md`

### Firebase 側の設定

1. Firebase Console で Authentication → Google プロバイダを有効化
2. Firestore を作成し、リポジトリの `firestore.rules`（全拒否）を Firebase Console のルールに貼って公開する。データアクセスはすべて API Routes（Admin SDK）経由で、クライアントから Firestore を直接読み書きしない（利用上限カウンタの改ざん防止）

3. サービスアカウントの秘密鍵を発行し、`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` に設定

4. **相談の RAG 検索（チャンク検索・PLAN 58）のベクトルインデックスを作る**。インデックスが無い間は `chunks` を全件読んでメモリで類似度を計算するフォールバックが動くので、途中で動作は止まらない（件数が増えると遅くなる）
   1. **既存記録を移行する**：`npm run backup` → `node scripts/backfill-chunks.mjs`（ドライラン）→ `--apply`。手順は `docs/OPS-backfill-chunks.md`。チャンクが1つも無い人は、移行が済むまで旧 `thoughts.embedding` の検索にフォールバックする
   2. **`chunks` のベクトルインデックスを作成する**。`gcloud` でプロジェクトを選択した状態で実行する：

      ```bash
      gcloud firestore indexes composite create --collection-group=chunks --query-scope=COLLECTION --field-config=vector-config='{"dimension":"1536","flat": "{}"}',field-path=embedding --database="(default)"
      ```

   - インデックスが無い状態で最初に `findNearest` が失敗すると、サーバーログ（`[rag] chunks の findNearest に失敗…`）にインデックス作成用のコンソールリンクも出る。それでも作成できる
   - 相談 API は `[consult] embed=…ms search=…ms source=chunks|chunks-scan|legacy|legacy-scan first_token=…ms` を出す。`source=chunks-scan` が続くならインデックスが無い
   - 参考記録のしきい値（`RAG_MIN_SIMILARITY`＝0.3）と1記録あたりの文字数（800）は `lib/logic/ragChunks.ts`
   - （旧）`thoughts` の `embedding` へのインデックスは、チャンクが無い人のフォールバックにだけ使う。旧の移行スクリプト `migrate-embeddings.mjs` は 2026-10-24 に削除した

## エラーハンドリング（MVP）

### API エラー

Claude / OpenAI API が応答しない/タイムアウト時：
- ユーザーに「エラーが発生しました。もう一度試してください」と表示

### フォーマットエラー

成形は Structured Outputs（JSON スキーマ強制）を使うためパース失敗は原則発生しない。それでも異常応答（`stop_reason: "refusal"` や `max_tokens` 到達で不完全）だった時：
- ユーザーに「申し訳ない、もう一度詳しく説明してもらえますか？」と聞く

### 情報不足

テキストが短すぎて分類できない時：
- ユーザーに「もっと詳しく教えてください（1文のみで大丈夫）」と促す

### 不完全入力

ユーザーが不完全な入力をした時：
- それでも保存し、深掘り質問で不足情報を補完

### 記録不足（コールドスタート）

相談時に記録が3件未満の時：
- 分析せず「まずは3日分記録してみましょう（現在◯件）」と案内

### 認証エラー

ID トークンが無効/期限切れの時：
- `/` にリダイレクトし、再ログインを促す

## プライバシー注記

- 音声入力（Web Speech API）はブラウザによって音声データが外部サーバー（例：Chrome は Google）に送信される。アプリ内の音声入力 UI に一言注記を表示すること

## MVP スコープ

### 実装する機能

- Google 認証（Firebase Authentication）
- 記録（音声/テキスト入力）
- AI による深掘り質問 + 成形（日記＋回答を6項目へ統合）
- 検索・相談・パターン分析（スレッド単位のチャット・相談履歴一覧）
- カレンダー表示（継続を可視化）
- 連続日数表示（ストリーク）

### 実装しない機能

- 複数言語対応
- データエクスポート
- グラフ化・可視化機能
- ソーシャル機能
- チーム機能
- AI の学習カスタマイズ
- 保存済み記録の編集（削除→書き直しで代替）
- 通知・リマインダー

## 開発フロー

### 1. 機能開発

- 実装計画に従ってタスクを実行
- 各タスク完了後にコミット

### 2. テスト

- **Vitest** でロジック部のユニットテストを書く（コサイン類似度計算、ストリーク計算、日付境界処理など）
- 統合テスト：AI とデータベースの連携テスト
- 手動テスト：実際の使用フロー確認
- UI の細部までテストで縛らない。「ロジックにはテストを書く」を基準とする

### 3. コミット戦略

- コミット粒度：1タスク = 1コミット
- メッセージ：`feat:`, `fix:`, `test:` で始める
- 頻繁にコミット（デプロイできる状態を保つ）

## 今後の拡張（参考）

### MVP 完成後

- 9時の振り返り通知
- 定期レポート生成
- 保存済み記録の編集（6項目の編集→再ベクトル化）
- 音声入力のサーバー側 STT 化（Whisper 等）
- AI の学習カスタマイズ
- データエクスポート
- グラフ化・可視化

---

技術設計の詳細は `docs/ARCHITECTURE.md` を参照。
Claude プロンプト設計の詳細は `docs/mentor-prompt.md` を参照。
