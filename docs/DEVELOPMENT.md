# Brain Bot - 開発者向けガイド

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
cd brain_bot

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
```

### Firebase 側の設定

1. Firebase Console で Authentication → Google プロバイダを有効化
2. Firestore を作成し、セキュリティルールを設定：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. サービスアカウントの秘密鍵を発行し、`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` に設定

## エラーハンドリング（MVP）

### API エラー

Claude / OpenAI API が応答しない/タイムアウト時：
- ユーザーに「エラーが発生しました。もう一度試してください」と表示

### フォーマットエラー

Claude が出力フォーマットを守らない（JSONパース失敗）時：
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
- AI 自動分類 + 深掘り質問 + サマリー生成
- 検索・相談・パターン分析
- カレンダー表示（継続を可視化）
- 連続日数表示（ストリーク）

### 実装しない機能

- 複数言語対応
- データエクスポート
- グラフ化・可視化機能
- ソーシャル機能
- チーム機能
- AI の学習カスタマイズ
- 相談の会話履歴保存・マルチターン対話
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
- 相談履歴の保存・マルチターン対話
- AI の学習カスタマイズ
- データエクスポート
- グラフ化・可視化

---

技術設計の詳細は `docs/ARCHITECTURE.md` を参照。
Claude プロンプト設計の詳細は `docs/mentor-reference.md` を参照。
