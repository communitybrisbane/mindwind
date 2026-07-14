# MindWind - 実装計画

1タスク = 1コミット。各タスクは完了時に「動く状態（デプロイ可能）」であること。
仕様の正は `ARCHITECTURE.md` / `DESIGN-mindwind.md` / `mentor-prompt.md`。画面は `mockups/` のモックに合わせる。

## Phase 0：環境準備（手作業・コード不要）

- [x] Firebase プロジェクト作成（Authentication で Google 有効化・Firestore 作成・セキュリティルール設定・Admin SDK 秘密鍵発行）
- [x] Anthropic API キー発行＋月額 spend limit 設定
- [x] OpenAI API キー発行＋spend limit 設定
- [x] `.env.example` をコピーして `.env.local` に各キーを設定（Anthropic/OpenAI キーは疎通確認済み）

## Phase 1：スキャフォールド

- [x] 1. Next.js（App Router・TypeScript・Tailwind）を初期化し、Vitest / ESLint を設定
- [x] 2. デザイントークンを Tailwind に定義（カラーパレット・フォント・spacing。DESIGN §2〜4）＋ アプリシェル（max-width 430px 中央寄せ・基準 390×844）
- [x] 3. 全ルートの雛形ページとタブバーを作成（`/` `/onboarding` `/home` `/record` `/search` `/terms` `/privacy`。タブアイコン＝スパイラル/ブロック/吹き出し）
- [x] 4. Firebase 初期化（クライアント SDK / Admin SDK・env 読み込み・`lib/db/` の土台）

## Phase 2：開発用ユーザー・プロフィール

認証は最後（Phase 6）に回す。それまでは開発用の固定ユーザー（dev 環境のみ有効・本番ビルドでは無効）でデータを保存・閲覧できるようにする。

- [x] 5. 開発用ユーザースタブ（`verifyUser` が dev のみ固定 uid を返す・クライアント側 `useUser` フック。`NODE_ENV=production` では無効化）
- [ ] 6. オンボーディング画面（呼び名・いましていること・ステージチップ・目標／スキップ可）＋ profile 保存
- [ ] 7. プロフィール編集モード（Hero 歯車から・値復元・保存）※ログアウトは Phase 6 で

## Phase 3：記録フロー（日記 → 深掘り → 成形）

- [ ] 8. 記録ページのチャット UI 骨格（ステップバー・日付見出し・空状態・書くヒント・下部固定入力バー〔1行→複数行の2状態〕）
- [ ] 9. 音声入力コンポーネント（Web Speech API・`onend` 自動再開ループ・追記方式・非対応時マイク非表示。独立コンポーネント化）
- [ ] 10. 深掘り API Route（Haiku 4.5・メンタープロンプト共通部＋深掘り追記・`{{profile}}` 注入）＋質問バブル表示とスキップ
- [ ] 11. 成形 API Route（Sonnet 5・Structured Outputs で6項目＋タイトル）＋チャット内編集カード
- [ ] 12. 保存処理（6項目連結→OpenAI embedding→thoughts 保存→トースト→`/home` 遷移）
- [ ] 13. 記録ライフサイクル（recordChat の保存・復元、保存済みカードの読み取り専用化、上限3件/日、Asia/Tokyo 日付リセット）※日付境界ロジックは `lib/logic/` にテスト付きで

## Phase 4：ホーム

- [ ] 14. Hero カード（挨拶〔nickname〕・日付・ストリーク・歯車）＋ストリーク計算ロジック（Vitest）
- [ ] 15. カレンダー（月送り・記録日点灯・今日アウトライン。Asia/Tokyo 境界のテスト）
- [ ] 16. 最近の記録（アコーディオン・6項目表示・削除〔確認ダイアログ→再計算〕・空状態）

## Phase 5：相談

- [ ] 17. 相談ページのチャット UI（空状態・バブル〔ユーザー=House Green〕・下部固定入力バー・ヘッダーアイコン行）
- [ ] 18. RAG 検索（`lib/logic/` にコサイン類似度・上位5件抽出。Vitest）＋記録3件未満ガード
- [ ] 19. 相談 API Route（Opus 4.8・adaptive thinking・streaming・prompt caching・スレッド履歴20件・参考記録 refs 返却）＋参考記録チップ→中央モーダル
- [ ] 20. スレッド管理（新規相談〔記録への誘導ダイアログ〕・履歴ドロワー・スレッド削除・30メッセージ/日の上限）

## Phase 6：認証（最後に実装・開発用スタブを差し替え）

- [ ] 21. スタート画面（ロゴ・Google ではじめる・規約同意リンク）＋ Google ログイン実装
- [ ] 22. 認証ガード（未ログイン→`/`、初回ログイン（profile 未設定）→`/onboarding`、ログイン済→`/home`）＋開発用スタブの除去
- [ ] 23. ログアウト＋アカウント削除（確認ダイアログ→Google 再認証→`users/{uid}` 全削除→Auth 削除）
- [ ] 24. 利用規約・プライバシーポリシーのプレースホルダーページ

## Phase 7：仕上げ

- [ ] 25. エラーハンドリング共通化（API タイムアウト・refusal・記録不足・認証切れ。DEVELOPMENT §エラーハンドリング）
- [ ] 26. 375px（iPhone SE）で全画面検証＋アクセシビリティ（aria-label・フォーカス表示・44px タッチターゲット）
- [ ] 27. Vercel デプロイ（env 設定・本番動作確認・spend limit 最終確認）

## 進め方のルール

- タスクを完了したらチェックを付け、そのタスク名でコミットする（例：`feat: 深掘り API Route と質問バブルを実装`）
- タスクの途中で仕様の不明点・矛盾を見つけたら、実装で勝手に解決せずユーザーに確認する
- 画面を仕様から変えた場合は mockups/ と docs/ を同時に更新する（CLAUDE.md のモック更新手順）
