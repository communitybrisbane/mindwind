# Brain Bot - 技術設計書

## 技術スタック

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: Claude API（分析・自動分類・深掘り質問）
- **Embeddings**: Claude Embeddings（ベクトル化）
- **Database**: Firebase Firestore（記録・ベクトル保存）
- **Authentication**: Firebase Authentication（後で実装）
- **Audio**: Web Speech API（音声入力）
- **Deploy**: Vercel

## ベクトル検索の実装方法（MVP）

### MVP での実装：シンプル実装

- Claude Embeddings でテキストをベクトル化
- Firestore に `embedding` フィールドで保存
- 検索時は全記録を読み込んで、コサイン類似度で上位5件を抽出
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

### 3. パターン分析プロンプト

複数の記録から判断基準を認識。
- 行動パターン → 心理パターン → 価値観パターン → 成功・失敗パターン

最終出力：「Yes/No の明確なアドバイス」

## データモデル（Firestore）

```
users/{userId}/
  └── thoughts/{thoughtId}/
      ├── date: timestamp
      ├── event: string
      ├── thinking: string
      ├── decision: string
      ├── reason: string
      ├── emotion: string
      ├── tags: array
      ├── embedding: vector
      └── values: string (AI推測)
```

## 記録フロー（3分以内）

1. **入力**：音声/テキストで自由に話す/書く
2. **AI が自動分類**：出来事・思考・行動・理由・感情・価値観に分類
3. **AI が深掘り質問**：必ず1回、現在の感覚をさらに掘り下げる質問
4. **ユーザーが答える**
5. **保存**：情報が完成して保存

## 検索・相談フロー

1. **ユーザーが質問**：「新しいプロジェクト始めるべき？」
2. **ベクトル検索**：関連する過去記録を上位5件抽出
3. **パターン分析**：行動・心理・価値観パターンを認識
4. **アドバイス生成**：Yes/No の明確なアドバイスを返す

## MVP スコープ

### 含める

- 記録（音声/テキスト入力）
- AI 自動分類 + 深掘り質問
- 検索・相談・パターン分析
- カレンダー表示（継続を可視化）
- 連続日数表示（ストリーク）

### 含めない

- Google 認証（後で実装）
- 複数言語対応
- データエクスポート
- グラフ化・可視化機能
- ソーシャル機能
- チーム機能
- AI の学習カスタマイズ

## 今後の拡張

### MVP 完成後

- Google 認証の実装
- 9時の振り返り通知
- 定期レポート
- AI の学習カスタマイズ
- データエクスポート
- グラフ化・可視化

---

詳細な Claude プロンプト設計は `docs/mentor-reference.md` を参照。
