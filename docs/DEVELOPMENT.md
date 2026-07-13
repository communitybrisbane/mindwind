# Brain Bot - 開発者向けガイド

## セットアップ詳細

### 前提条件

- Docker & Docker Compose
- Node.js 18+
- Firebase プロジェクト
- Claude API キー

### インストール手順

```bash
# リポジトリをクローン
git clone <repository>
cd brain_bot

# 環境変数を設定
cp .env.example .env.local

# Docker Compose で起動
docker-compose up -d

# ブラウザで開く
open http://localhost:3000
```

### 環境変数の設定

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Claude API
CLAUDE_API_KEY=your_claude_api_key
```

## エラーハンドリング（MVP）

### API エラー

Claude API が応答しない/タイムアウト時：
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

## MVP スコープ

### 実装する機能

- 記録（音声/テキスト入力）
- AI 自動分類 + 深掘り質問
- 検索・相談・パターン分析
- カレンダー表示（継続を可視化）
- 連続日数表示（ストリーク）

### 実装しない機能

- Google 認証（後で実装）
- 複数言語対応
- データエクスポート
- グラフ化・可視化機能
- ソーシャル機能
- チーム機能
- AI の学習カスタマイズ
- 通知・リマインダー

## 開発フロー

### 1. 機能開発

- 実装計画に従ってタスクを実行
- 各タスク完了後にコミット
- テストを先に書く（TDD）

### 2. テスト

- ユニットテスト：個別機能のテスト
- 統合テスト：AI とデータベースの連携テスト
- 手動テスト：実際の使用フロー確認

### 3. コミット戦略

- コミット粒度：1タスク = 1コミット
- メッセージ：`feat:`, `fix:`, `test:` で始める
- 頻繁にコミット（デプロイできる状態を保つ）

## 今後の拡張（参考）

### MVP 完成後

- Google 認証の実装
- 9時の振り返り通知
- 定期レポート生成
- AI の学習カスタマイズ
- データエクスポート
- グラフ化・可視化

---

技術設計の詳細は `docs/ARCHITECTURE.md` を参照。
Claude プロンプト設計の詳細は `docs/mentor-reference.md` を参照。
