# Brain Bot - 技術設計書

## 技術スタック

- **Frontend**: Next.js（最新安定版・App Router）+ TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes（Firebase Admin SDK）
- **AI**: Claude API（分析・自動分類・深掘り質問・サマリー生成）
- **Embeddings**: OpenAI `text-embedding-3-small`（1536次元・ベクトル化）
- **Database**: Firebase Firestore（記録・ベクトル保存）
- **Authentication**: Firebase Authentication（Google ログイン、MVP から実装）
- **Audio**: Web Speech API（音声入力）
- **Deploy**: Vercel

## 認証・セキュリティ設計

- スタート画面（`/`）の「はじめる」ボタン = Google ログイン。成功後 `/home` へ遷移
- クライアントは Firebase ID トークンを API リクエストに添付（`Authorization: Bearer <token>`）
- API Routes は Firebase Admin SDK でトークンを検証し、`uid` に紐づく記録のみ操作
- Firestore セキュリティルール: `request.auth.uid == userId` で本人以外のアクセスを遮断
- Claude / OpenAI の API キーはサーバー側のみで使用（クライアントに露出しない）

## ベクトル検索の実装方法（MVP）

### MVP での実装：シンプル実装

- 記録保存時、統合サマリー（`summary`）を OpenAI `text-embedding-3-small` でベクトル化
- Firestore に `embedding` フィールド（number 配列・1536次元）で保存
- 相談時は API Routes（Admin SDK）が本人の全記録を読み込み、コサイン類似度で上位5件を抽出
- 抽出した記録を Claude に渡してパターン分析・アドバイス生成

### 特徴

- 実装がシンプル（追加 DB 不要）
- 数百件程度のデータで十分パフォーマンス出力可能
- 新卒向けアプリの初期ユーザー数に対応可能

### 将来：Firestore Vector Search への移行

- データが増えてパフォーマンス問題が出たら、Firestore Vector Search にネイティブ移行可能

## Claude へのプロンプト設計

詳細は `docs/mentor-reference.md` を参照。

### 1. 自動分類プロンプト

ユーザーの自由なテキスト入力を以下に分類：
- 出来事、思考、行動、理由、感情、価値観

### 2. 深掘り質問プロンプト（現在志向）

自動分類の結果に対して、必ず1回だけ質問を生成。
- 優先度1：不足情報を具体化
- 優先度2：現在の心理状態を掘る
- 優先度3：矛盾する感情の優先度を聞く

### 3. サマリー生成プロンプト

元の入力・分類結果・深掘り回答を統合し、自然な文章のサマリーを生成。
- ダッシュボードの展開表示に使用
- ベクトル化の対象（embedding はこのサマリーから生成）

### 4. パターン分析プロンプト

複数の記録から判断基準を認識。
- 行動パターン → 心理パターン → 価値観パターン → 成功・失敗パターン

最終出力：「Yes/No の明確なアドバイス」

## データモデル（Firestore）

```
users/{userId}/
  └── thoughts/{thoughtId}/
      ├── date: timestamp
      ├── rawText: string           # 元の入力全文
      ├── event: string             # 出来事
      ├── thinking: string          # 思考
      ├── action: string            # 行動
      ├── reason: string            # 理由
      ├── emotion: string           # 感情
      ├── values: string            # 価値観（AI推測）
      ├── deepDiveQuestion: string  # 深掘り質問
      ├── deepDiveAnswer: string    # 深掘り回答
      ├── summary: string           # 統合サマリー（表示・ベクトル化に使用）
      ├── tags: array
      └── embedding: number[1536]   # summary のベクトル
```

## アプリシェル

- **モバイルネイティブ設計**: max-width `430px` の固定幅で、PCブラウザでも中央にスマホアプリ風に表示
- **レイアウト**: body に `flex justify-center`、アプリシェルに `shadow` を付与してデバイスフレーム感を演出
- **ナビゲーション**: 上部ヘッダー（48px、backdrop-blur）＋下部タブバー（56px、3タブ：ホーム/記録/相談）
- **スタート画面 (`/`)**: ナビなし。ロゴ＋タグライン＋「Google ではじめる」ボタンのみ
- **ダッシュボード (`/home`)**: ストリーク、カレンダー、最近の記録
- **viewport**: `viewport-fit=cover` で iPhone ノッチ対応

## ルーティング

| パス | 画面 | ナビ表示 | 認証 |
|------|------|----------|------|
| `/` | スタート画面（Google ログイン） | なし | 不要 |
| `/home` | ダッシュボード | あり | 必要 |
| `/record` | 記録ページ | あり | 必要 |
| `/search` | 相談ページ | あり | 必要 |

未ログインで認証必須ページにアクセスした場合は `/` にリダイレクト。

## 記録フロー（3分以内）

1. **入力**：音声/テキストで自由に話す/書く
2. **AI が自動分類**：出来事・思考・行動・理由・感情・価値観に分類
3. **AI が深掘り質問**：必ず1回、現在の感覚をさらに掘り下げる質問
4. **ユーザーが答える**
5. **保存**：サマリー生成 → ベクトル化 → Firestore に保存

## 検索・相談フロー

1. **ユーザーが質問**：「新しいプロジェクト始めるべき？」
2. **記録数チェック**：記録が3件未満なら分析せず「まずは3日分記録してみましょう（現在◯件）」と案内
3. **ベクトル検索**：関連する過去記録を上位5件抽出
4. **パターン分析**：行動・心理・価値観パターンを認識
5. **アドバイス生成**：Yes/No の明確なアドバイスを返す

相談は単発の Q&A（1質問1回答）。会話履歴の保存・マルチターン対話は MVP に含めない。

## ストリーク・カレンダーの判定基準

- タイムゾーンは **日本時間（Asia/Tokyo）固定**、0時が日付境界
- その日に1件でも記録すればその日は「記録あり」としてカウント
- ストリーク = 今日（または昨日）から遡って連続で記録がある日数

## MVP スコープ

### 含める

- Google 認証（Firebase Authentication）
- 記録（音声/テキスト入力）
- AI 自動分類 + 深掘り質問 + サマリー生成
- 検索・相談・パターン分析
- カレンダー表示（継続を可視化）
- 連続日数表示（ストリーク）

### 含めない

- 複数言語対応
- データエクスポート
- グラフ化・可視化機能
- ソーシャル機能
- チーム機能
- AI の学習カスタマイズ
- 相談の会話履歴保存・マルチターン対話
- 通知・リマインダー

## 今後の拡張

### MVP 完成後

- 9時の振り返り通知
- 定期レポート
- 相談履歴の保存・マルチターン対話
- AI の学習カスタマイズ
- データエクスポート
- グラフ化・可視化

---

詳細な Claude プロンプト設計は `docs/mentor-reference.md` を参照。
