# MindWind - 技術設計書

> **2026-10 改訂（新 UI v5・Phase 12〜19）**：記録フローを「日記 → 深掘り1問 → 保存」に変え、6項目への成形カードを無くした。RAG は本人の言葉を書き換えずに分けた **チャンク** で行う。気分の玉（`moods/{date}`）・一言の記録（`kind: "quick"`）・週の手紙（`letters`）・端末内の下書き・自動ゲスト開始・App Check と IP レート制限を足した。
> 名前・型・API・ファイルの持ち主の正は `docs/IMPLEMENTATION-CONTRACT.md`（この文書と食い違ったら契約書が正。直すときは両方を同時に）。見た目と動きの正は `docs/prototype/ui-v5.html` と `docs/DESIGN-mindwind.md`。AI の正は `docs/AI-CONSTITUTION.md` と `docs/mentor-prompt.md`。

## 技術スタック

- **Frontend**: Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS v4（`@theme` に色・書体のトークン）
- **Backend**: Next.js API Routes（Firebase Admin SDK）＋ `proxy.ts`（Next 16 で middleware から改名。Node ランタイム。App Check と IP レート制限）
- **AI**: Claude API（深掘り=Haiku 4.5／相談=Opus 4.8／検索用メタ・手紙は承認つきタスクで決める。詳細は「使用モデルと API 機能」）
- **Embeddings**: OpenAI `text-embedding-3-small`（1536次元・チャンクごとにベクトル化）
- **Database**: Firebase Firestore（記録・チャンク・気分・手紙・相談）
- **Authentication**: Firebase Authentication（**起動時に裏で匿名ゲストを自動作成**。設定で Google に連携〔`linkWithPopup`〕。uid が変わらないのでデータはそのまま引き継がれる）
- **ボット対策**: Firebase App Check（reCAPTCHA Enterprise）＋ IP 単位のレート制限（Upstash Redis など）
- **Audio**: Web Speech API（音声入力。iOS Safari の自動停止には onend 自動再開ループで対応。非対応環境はマイク非表示）
- **Deploy**: Vercel（本番: https://mindwind.days-count.com。master への push で自動デプロイ）

## 認証・入口

### 自動ゲスト開始（PLAN 48）

- `/` は起動画面（革の机にカードが落ちる → ロゴ → 「タップしてスタート」）。演出の裏で `useEnsureUser()` が未ログインなら `signInAnonymously` する。**スタート画面（Google ではじめる／ゲストで試す）とオンボーディングは廃止**（`/onboarding` は `/settings` へ `redirect()`）
- `AuthGuard` は未ログインでも `/` へ飛ばさず、裏でゲストを用意してから中身を出す。API が 401 を返したときは `authedFetch` が `/` へ戻す（既存どおり）
- 「タップしてスタート」後、`GET /api/mood` を見て、今日の気分が null かつ この端末で今日まだ回転盤を出していない（`localStorage["mindwind:moodPromptedOn"] !== today`）なら `/mood`、それ以外は `/home`
- **自動の呼び名**：`autoNameFor(uid)`（FNV-1a 32bit % 9 → 風見・風車・風鈴・渡り鳥・旅人・凧・羽根・帆・風読み。表示は「◯◯さん」）。**表示専用で AI には渡さない**（`{{profile}}` に入るのは本人が入力した `nickname` だけ。憲法第12条3項）
- 既存ユーザー（Google ログイン済み・profile あり）はそのまま使える

### Google 連携・ログインし直し（PLAN 50。`components/settings/useAccount.ts`）

- 設定のアカウント欄の「守る」→ `linkWithPopup`（Google）。uid が変わらないので記録はそのまま。上限は会員の値になる。歯車の赤い点も消える
- **すでに使われている Google アカウント**（`auth/credential-already-in-use`）：「ログインし直す」の確認ダイアログ（いまのゲストの記録は引き継げず消える、と警告）→ 同意したら `signInWithCredential` でその Google アカウントに入り直す → `/home`。残ったゲストのデータは古いゲストの掃除（PLAN 54）で消える
- **ログアウト**：`signOut` → `/`。ゲストのときは警告（つなぐ／ログアウト／やめる。ゲストは再ログインできないため）
- **アカウント削除**：赤いボタンを長押し（1300ms）→ Google は `reauthenticateWithPopup`（`auth/requires-recent-login` 対策）、ゲストは省く → `DELETE /api/account`（`users/{uid}` を `recursiveDelete`）→ `deleteUser` → `/`
- 連携を促す合図は**ホームの歯車の小さな赤い点だけ**（ゲストのみ・設定を開いたら消える・消して7日後にまた出す〔`NUDGE_REPEAT_DAYS`〕・端末ごと localStorage）。文字のフッターは出さない

### セキュリティ

- クライアントは Firebase ID トークンを添付（`Authorization: Bearer <token>`）。API Routes は Admin SDK で検証し、`uid` に紐づくデータだけ操作する
- Firestore セキュリティルール: `request.auth.uid == userId` で本人以外のアクセスを遮断（Firestore ルール + API のトークン検証の二重防御。憲法第11条）
- ゲスト判定はサーバー側で ID トークンの `sign_in_provider === "anonymous"` を見る（偽装不可）
- Claude / OpenAI / Firebase Admin / Upstash のキーはサーバー側のみ（憲法第14条）
- 入力サイズはサーバー側で検証（`lib/logic/limits.ts`：日記・深掘りの答え 5000字、相談1メッセージ 2000字、一言 2〜60字〔trim 後〕、呼び名 12字。日記は10字未満なら AI を呼ばずにトースト「もう少し書いてみてね（10文字以上）」）
- セキュリティヘッダーを全ページに付与（`next.config.ts`：`frame-ancestors 'none'` + `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy` でカメラ等を無効化〔マイクは音声入力で使うため許可〕）
- `/dev-login` は開発専用（カスタムトークンで UI 検証用ログイン）。本番では何もせず `/` へ戻す

### App Check とレート制限（PLAN 52・53。`proxy.ts`）

入口を自動ゲストにした分、悪用されたときの費用を守る。

- **App Check**（52）：reCAPTCHA Enterprise。クライアントは `lib/db/appCheck.ts` で初期化し、`authedFetch`（`lib/db/useUser.ts`）が `X-Firebase-AppCheck` ヘッダーを付ける。`proxy.ts` が `/api/*` でトークンを検証（`lib/api/appCheck.ts`）。不可は `401 { error: "app_check_failed" }`。Firebase Console で Auth・Firestore にも強制する。開発では debug token（環境変数は `docs/DEVELOPMENT.md`）
- **IP レート制限**（53）：`proxy.ts` が `/api/*`（記録・深掘り・相談・手紙）に IP 単位の分あたり上限をかける（`lib/api/rateLimit.ts`）。超過は `429 { error: "rate_limited", retryAfter }`、画面はやさしい文言のトースト。新規の匿名ログインにも IP 単位の日あたり上限を置く（匿名ログインはクライアントから Firebase Auth へ直接行くため、`proxy.ts` だけでは止められない。どこで数えるかは 53 で決める）
- 順序：`proxy.ts` は 52 → 53 の順に書く。ユーザー単位の日次クォータ（下記「レート制限」）・各社の月額 spend limit と合わせて三重の守りにする

## 記録フロー（新 UI v5）

記録は**2段階**：**日記 → 深掘り（1問・スキップ可）→ 長押しで保存**。6項目への成形カードは画面から無くした（`POST /api/shape` は削除）。**画面に出るのは本人の文章と、深掘りの質問と答えだけ**。AI が本人の文章を書き換えることはない（表示も AI 入力も `rawText` / `deepDiveAnswer` / `chunk.text` のまま）。

```
記録タブ /record
  日記を書く（音声可・下書きは端末内に自動保存）
    └ 「書き終えた」 ─ 10字未満 → トースト（AI を呼ばない）
         └ POST /api/deepdive { diary } → 余白に緑インクで1問
              └ 答える or とばす
                   └ 長押し → POST /api/thoughts { rawText, deepDiveQuestion, deepDiveAnswer, date? }
                        ├ サーバー：検証 → 日次上限 → 過去日1件 → チャンク分割 → チャンクの embedding → thought＋chunks を1トランザクションで保存
                        ├ after()：検索用メタを裏で生成して embedding を作り直す（PLAN 57）
                        └ 封蝋の演出 → /home ＋ トースト「記録したよ。」
```

1. **日記**：罫線ノートに自由に書く（音声可）。入力中の文章は端末内の下書き（後述）に保存される
2. **深掘り**：「書き終えた」で `POST /api/deepdive`。メンターが余白に**1問だけ**緑インクで書く（憲法第6条2項）。答えてもとばしてもよい
3. **保存**：長押しで封をする。サーバーは
   - 入力検証（full は10字以上・5000字以下。`date` は "YYYY-MM-DD"・未来は `400 invalid_date`）
   - 日次上限（`consumeQuota` の `record`。超過は `409 daily_limit`）と過去日1件制約（`409 date_taken`）
   - タイトルを本文の先頭から自動で作る（`autoTitle()`：先頭行を 。！？改行 で区切り 20字まで。**AI は使わない**）
   - `splitIntoChunks()` でチャンクに分け、各チャンクを embedding して、thought と chunks を同じトランザクションで書く
   - 成功で `200 { id, title, date }`。embedding・保存の失敗は `502 save_failed`（使った記録枠は返却）
4. **保存後**：`/home` へ遷移。下書きは削除。風の記録・今週の便箋の帯が点く

### 一言だけの記録（quick。PLAN 64・65）

- 回転盤で気分を決めたあとの3択「一言だけ書く／しっかり書く／今日はここまで」の「一言」から。`/mood/write` で一言（2〜60字）を書き、長押しで `POST /api/thoughts { rawText, kind: "quick" }`
- `thoughts` に `kind: "quick"` で保存し、**通常の記録と同じ扱い**（日次上限・過去日1件・一覧・削除・RAG の対象）。保存時点の今日の気分を `mood` に入れる（表示専用）
- チャンクは1つ（本文そのまま）。チャンクの `meta` に `moodMetaLine(mood)` を入れて embedding する（AI は呼ばない）
- **あとから深掘りを足せる**（`components/record/AddDeepDive.tsx`）：quick の本文を `diary` として `POST /api/deepdive` → 答えを `PUT /api/thoughts/[id] { deepDiveQuestion, deepDiveAnswer }` → チャンク・embedding を作り直す

### 過去日付の記録（バックデート）

- 入口は、ホームの今週の便箋の帯 → **風の記録（月）**の日付タップ → その日の記録モーダル（67 の `ThoughtModal`）。記録0件の過去日なら「この日の日記を書く」→ `/record?date=YYYY-MM-DD`。未来日は不可
- **過去日は1日1件まで**（0件の日だけ書ける）。今日は複数件可（安全上限30件/日）
- `thoughts.date` = 対象日、`createdAt` = 実際に書いた時刻。**未来日は 400**、**過去日に1件以上あれば 409 `date_taken`**（0時またぎのレースもトランザクションで防ぐ）
- **日次上限は「今日書いた件数」で数える**（過去日を指定して上限をすり抜けるのを防ぐ）
- プロンプトは変えない（深掘りは「いま振り返ってどう感じるか」の現在志向のまま過去日でも成立する）
- ストリーク・帯・風の記録は date ベース。過去日を埋めると途切れた日がつながる（意図した挙動）

### 保存後の表示・編集・削除（PLAN 67）

- 入口は2つ：**記録タブのしおり**（今日の保存済み。`GET /api/thoughts?date=today`）と、**風の記録（月）の日付モーダル**。新ホームには従来のカレンダーと「最近の記録」の一覧を置かない
- 表示は本人の文章＋深掘りの質問と答え（旧記録で `rawText` しか無いものもそのまま表示）
- **編集**：本文と深掘りの答えを直す（`PUT /api/thoughts/[id]`）。サーバーがタイトルを作り直し、チャンクを同じ id（`${thoughtId}_${order}`）に上書き・余った order を削除・embedding を再生成し、`after()` でメタも作り直す。`date` は編集できない
- **削除**：`DELETE /api/thoughts/[id]` で thought と同じ `thoughtId` の chunks を全部消す（完全削除。憲法第13条）。その記録を引用した手紙は残し、引用だけ伏せる（`refs[i].deleted = true`・`quote = ""`。PLAN 79）

### 下書き（端末内だけ。PLAN 68）

- 記録タブの書きかけを **ブラウザの localStorage** に保存する（`useDraft`）。キーは `draftKey(mode, dateKey)` → `mindwind:draft:today:2026-10-25` / `mindwind:draft:past:2026-10-20`（今日モードと過去日モードは別）
- 中身は `DraftData = { rawText, deepDiveQuestion, deepDiveAnswer, step: 1|2, savedAt }`。入力は 500ms のデバウンスで保存、音声は認識が確定するたびに保存。開いたときに復元し、保存成功で削除
- **サーバーには送らない**。旧 `recordChat`（サーバー側の当日チャット）は廃止（56 から書かない・`GET /api/record-chat` は 80 で削除）

## チャンクと検索用メタ（PLAN 55〜58）

### チャンク分割（`lib/logic/chunk.ts`）

- 本人の言葉を**書き換えずに分ける**だけ。目安 200〜400字・段落と文の境界で切る・文の途中で切らない・短い本文は1チャンク・quick は1チャンク
- 深掘りの質問と答えは1チャンクにまとめる（`"Q: …\nA: …"`・`source: "deepdive"`）。答えが空なら作らない
- テストで「diary のチャンクを順に連結すると `rawText` と一字も違わない」ことを保証する

### 検索用メタ（PLAN 57。承認つき）

- 保存・編集のあと `after()` で裏で非同期に、各チャンクへ出来事・感情などの**一行メタ**を AI に作らせ、`meta` に入れて embedding を作り直す（入力は `${text}\n${meta}`）
- メタは**検索の精度を上げるためだけ**に使い、**画面にも相談・手紙の AI 入力にも出さない**
- 失敗してもチャンクの本文だけで検索できる（保存は失敗にしない）
- プロンプトは `docs/mentor-prompt.md` に追記（共通部＋メタ用追記）して**ユーザーの承認を取ってから**実装する（憲法第2条・第19条）

### RAG（PLAN 58。`lib/ai/rag.ts`）

1. **コールドスタート判定**：`count()` で記録件数を取る。`MIN_THOUGHTS_FOR_CONSULT`（3件）未満なら分析せず案内
2. 質問（追い質問に備えて直前のユーザー発言を連結）をベクトル化し、**`chunks` コレクショングループ**を `findNearest`（`embedding`・COSINE）で検索
3. チャンクを**記録単位にまとめて上位5件**。類似度しきい値で無関係な記録を落とす
4. AI に渡すのは**本人の言葉のチャンク `text` ＋ `date`**（meta は渡さない）。`refs` は `{ id, date, title, quote }`（quote は当たったチャンクの `text`）
5. 移行中（PLAN 59 の完了まで）は旧 `thoughts.embedding` の検索へフォールバックできるようにしておく。`readEmbedding` は配列・ベクトル型の両方を読める
6. ベクトル化・検索・最初の文字が出るまでの時間をログに出す（thinking の設定を軽くするかは計測結果を見て別途判断）

運用上の必須作業：

- **ベクトルインデックス**：`chunks` コレクショングループ・`embedding`・1536次元・COSINE（コマンドは `docs/DEVELOPMENT.md`。58 が書く）。旧 `thoughts` のインデックスは移行完了まで残す
- **既存データの移行**（PLAN 59）：実行前に `npm run backup` → `scripts/backfill-chunks.mjs` をドライラン → 本実行。既存の `rawText`・深掘りからチャンクを作る。旧6項目フィールドと旧 `embedding` は移行完了まで残す（消す手順は下の「移行後の手順」。PLAN 60）

## 気分の玉（PLAN 61〜63）

- **その日の最初にアプリを開いたとき1回だけ**（端末ごと）、ホームの前に回転盤（`/mood`）を出す。スキップ（あとで）・選び直しができる
- 5段階（`lib/logic/moods.ts` の `MOODS`：とてもいい〜とてもつらい。名前は風の強さ）。決定で `PUT /api/mood { mood: 0-4 }` → `users/{uid}/moods/{YYYY-MM-DD}` に `{ mood, updatedAt }`。**今日のみ・同じ日は上書き**
- 今日の気分は `useTodayMood()` が1か所で取り、全画面（背景の風・封蝋・今週の便箋）に配る。決めた色はその日いっぱい背景にうっすら残す
- **玉だけで終えた日も「記録あり」の1日として数える**（`recordedDays()` = thoughts の日付 ∪ moods の日付。今週◯日・今週の便箋・風の記録）
- 気分は **RAG に入れない**（`moods` は検索対象外）。相談・手紙の AI 入力にも入れない。例外は quick のチャンクの `meta`（`moodMetaLine`。検索の embedding だけに効き、本文にも表示にも出ない）
- 風の記録（月／年）は `GET /api/moods?from&to`（最大366日・AI を呼ばない読み取り専用）。無い日も `{ mood: null, records: 0 }` で埋めて返す

## 週の手紙（PLAN 75〜79）

- 週は Asia/Tokyo の**月曜はじまり**。`weekKey` はその週の月曜の日付。`letterWeekFor(today)`：日曜ならその週、月〜土なら前の週（＝日曜に開けて翌土曜まで読める）
- その週に記録が **3日以上**（`MIN_THOUGHTS_FOR_LETTER`。気分だけの日も数える）のとき書ける
- **開いたときに生成**（スケジューラ・通知なし）。`GET /api/letters/current` が `status: "ready" | "locked" | "generating" | "none"` を返し、`none` なら画面が `POST /api/letters/current` で生成する
- 生成はトランザクションで `letters/{weekKey}` を `status: "generating"` にしてから始め、二重生成を防ぐ。`POST` は `202 generating` をすぐ返し、生成そのものは `after()` で裏で最後まで続けて保存する（画面を閉じても・切断しても止まらない）。画面は `GET` を数秒おきに取り直して受け取る（途中の文は流さない＝検証前の文を見せない）。日次クォータ `letter`（会員3回/日・ゲスト1回/日。やり直し込み。届いている・生成中のときは枠を使わない。止まった生成〔6分超〕を作り直すときは前の枠を戻す）。refusal・max_tokens・使えない手紙・AI の失敗は作りかけを消してクォータを返す（画面は `none` に戻ったのを見てエラー文を出し、次に開いたときにもう一度）
- **セーフティ（憲法第8条）をコードでも保証**：その週の本人の言葉に危機の言葉（`lib/logic/crisis.ts`）があれば、AI の出力から引用を全部落とし、窓口の案内（両方の番号）が無ければ固定文を足す。AI 自身が窓口を案内した手紙も引用を落とす。危機の週に AI の手紙が使えなければ、エラーではなく固定文だけの手紙（`model: "fixed-text"`）を届ける
- 本文の段落の「」『』で囲んだ言葉も、その週の記録に無ければ段落ごと落とす（言い換えを本人の言葉として出さない。4字未満の囲みは強調とみなす）
- AI に渡すのは**その週の本人の言葉のチャンク＋日付**だけ（meta・気分・呼び名は渡さない。宛名は画面側が表示名から付ける）
- 保存：`{ weekKey, from, to, status, blocks, refs, moods[7], recordDays, model, createdAt, readAt }`。`blocks` は緑インクの段落と引用（`{ type: "quote", ref }`）。`refs[].quote` は `rawText` / `deepDiveAnswer` の**部分文字列そのまま**であることをサーバーが検証する（`lib/logic/letterRefs.ts`。本人の言葉を言い換えさせない）
- 手紙は **RAG に入れない**。既読（`PUT { read: true }`）・過去の手紙一覧・手紙の削除ができる
- プロンプトは `docs/mentor-prompt.md` に手紙用追記を書いて**承認を取ってから**（PLAN 75）。モデルも 75 で決める（提案：`claude-opus-4-8`。週1通なのでコストは小さい）

## 使用モデルと API 機能

| 機能 | モデル | 理由と設定 |
|------|--------|-----------|
| 深掘り質問の生成 | `claude-haiku-4-5` | 短い出力・低レイテンシ優先（「書き終えた」の直後に待たせる場所）。thinking なし、`max_tokens: 300`。quick にあとから足すときも同じ |
| 検索用メタ（裏） | PLAN 57 で決める（承認つき） | ユーザーを待たせない裏の処理。画面にも相談にも出さない |
| 相談（RAG＋パターン分析＋アドバイス） | `claude-opus-4-8` | アプリの価値の核心。`thinking: {type: "adaptive"}` を明示、`effort` はデフォルト（high） |
| 週の手紙 | PLAN 75 で決める（提案：`claude-opus-4-8`） | 週1通・ストリーミング |
| ~~成形（6項目）~~ | ~~`claude-sonnet-5`~~ | **廃止**（`POST /api/shape` と `shape` クォータを削除。`MODELS.shaping` は 80 で整理） |
| ベクトル化 | OpenAI `text-embedding-3-small` | チャンクごと。入力は `meta ? text + "\n" + meta : text` |
| 音声入力 | Web Speech API | ブラウザ完結・無料 |

### 相談 API の必須機能

- **Streaming**: 回答をトークン単位で便箋に流す（`messages.stream`・NDJSON）
- **Prompt caching**: プレフィックスを「固定システムプロンプト（共通部＋相談追記＋プロフィール注入文）→ スレッド内履歴」の順に組み、履歴の最後に `cache_control` を置く。**可変部分（RAG のチャンク＋新しい質問）は必ず末尾**に置く

SDK は TypeScript（`@anthropic-ai/sdk`）を API Routes から使う。API キーはサーバー側のみ。

## Claude へのプロンプト設計

プロンプトの実文（共通部＋機能別追記：深掘り／相談／メタ〔57〕／手紙〔75〕）は `docs/mentor-prompt.md`「メンタープロンプト（実文）」に収録し、**一字も変えずに使う**。文面を変えるときは `mentor-prompt.md` を先に更新して承認を取る（憲法第2条）。

- **共通人格**：対等な相棒・記録は一例として提示・問い詰めない・裁かない・セーフティ（危機対応）。全 AI 呼び出しの冒頭に入れる
- **プロフィールの注入**（`{{profile}}`）：本人が入力した項目だけ1〜2文で入れる。未入力の項目は文に含めない。全未設定ならセクションごと省略。**自動の呼び名は入れない**。設定画面で編集できるのは呼び名だけになったが、既存ユーザーの `activity` / `stage` / `goal` は残して注入に使う
- **深掘り**：日記に対して必ず1回だけ質問する（不足情報の具体化 → 現在の心理状態 → 矛盾する感情の優先度）
- **相談**：本人の言葉のチャンクを根拠に、結論ファースト・記録引用・200字程度。記録に根拠がなければ正直に言う
- 6項目への成形プロンプトは使わない（画面から成形カードを無くしたため）

## データモデル（Firestore）

```
users/{uid}/
  ├── profile: map
  │   ├── nickname: string          # 呼び名（≤12。空なら表示は自動の呼び名。AI にはこの値だけ渡す）
  │   ├── activity: string          # 残す（AI の {{profile}} 用。設定画面では編集しない）
  │   ├── stage: string | null      # 残す（同上）
  │   ├── goal: string              # 残す（同上）
  │   └── hideStreak?: boolean      # ホームの「今週◯日」を隠す
  ├── thoughts/{thoughtId}/         # 記録（本人の文章そのまま）
  │   ├── date: string              # "YYYY-MM-DD"（Asia/Tokyo）。過去日の記録は過去日
  │   ├── createdAt: timestamp      # 実際に書いた時刻（日次上限は この日付で数える）
  │   ├── rawText: string           # 日記本文（full）／一言（quick）
  │   ├── deepDiveQuestion: string  # 深掘りの質問（スキップ・quick は ""）
  │   ├── deepDiveAnswer: string    # 深掘りの答え（スキップ・quick は ""）
  │   ├── title: string             # 本文の先頭から自動（20字まで・AI は使わない）
  │   ├── kind: "full" | "quick"
  │   ├── mood?: 0-4                # quick のとき、保存時点の今日の気分（表示専用）
  │   ├── tags: array
  │   └── （旧）event/thinking/action/reason/emotion/values/embedding   # 移行完了まで残す。新規保存では書かない
  ├── chunks/{thoughtId}_{order}/   # RAG の検索単位
  │   ├── thoughtId: string
  │   ├── date: string
  │   ├── text: string              # 本人の言葉そのまま（分けるだけ）。表示・AI 入力はこれ
  │   ├── source: "diary" | "deepdive"
  │   ├── order: number             # 0 始まり。diary → deepdive の順
  │   ├── embedding: vector(1536)   # 入力は meta があれば text + "\n" + meta
  │   ├── meta?: string             # 検索用の一行メタ（画面にも相談にも出さない）
  │   └── createdAt: timestamp
  ├── moods/{YYYY-MM-DD}/           # 気分の玉（1日1つ・上書き）
  │   ├── mood: 0-4
  │   └── updatedAt: timestamp
  ├── letters/{weekKey}/            # 週の手紙（weekKey＝その週の月曜）
  │   ├── weekKey, from, to         # 月曜・日曜
  │   ├── status: "generating" | "ready" | "failed"
  │   ├── blocks: array             # { type: "text", text } | { type: "quote", ref }
  │   ├── refs: array               # { thoughtId, date, quote, deleted? }（quote は本人の文章の部分文字列）
  │   ├── moods: (0-4|null)[7]      # 月〜日の気分
  │   ├── recordDays: number
  │   ├── model: string
  │   ├── createdAt: timestamp
  │   └── readAt: timestamp | null
  ├── usage/{YYYY-MM-DD}/           # 日次クォータ（Asia/Tokyo）
  │   └── deepdive, consult, record, letter: number   # shape は使わなくなる（80 で型から消す）
  ├── chats/{chatId}/               # 相談スレッド（既存のまま。RAG に入れない）
  │   ├── title, createdAt, updatedAt
  │   └── messages/{messageId}/ { role, content, refs: thoughtId[], createdAt }
  └── recordChat                    # 廃止（新規に書かない。下書きは端末内）
```

- chunk の id は `${thoughtId}_${order}` で決め打ち（編集時は同じ id に上書き・余った order は削除）
- 端末内だけのデータ（localStorage）：下書き `mindwind:draft:*`・回転盤を出した日 `mindwind:moodPromptedOn`・設定 `mindwind:prefs`（音・振動・動きを減らす）・赤い点を消した日 `mindwind:nudgeDismissedOn`・再会カード `mindwind:reunion:<date>`。いずれもサーバーに送らない

## API 一覧

共通：`Authorization: Bearer <idToken>` 必須（無ければ `401 unauthorized`）。`/api/*` は `proxy.ts` で App Check と IP レート制限を通る。エラーは常に `{ error: ApiErrorCode }`（型は `lib/api/contracts.ts`）。

| メソッド・パス | 内容 | 主なエラー |
|---|---|---|
| `GET /api/thoughts[?date=]` | 記録の一覧（新しい順・最大2000。`date` でその日だけ） | 400 invalid_date |
| `POST /api/thoughts` | 記録を保存（full / quick）。チャンクと embedding も作る。本文か答えに危機の言葉（`lib/logic/crisis.ts`）があれば `crisis: true` を添え、画面が窓口を案内する（PUT も同じ。憲法第8条） | 400 invalid_body / too_short / too_long / invalid_date、409 daily_limit / date_taken、502 save_failed |
| `GET /api/thoughts/[id]` | 1件 | 404 not_found |
| `PUT /api/thoughts/[id]` | 本文・深掘りを直す／あとから深掘りを足す。チャンク・embedding・メタを作り直す | 400、404、502 update_failed |
| `DELETE /api/thoughts/[id]` | 完全削除（chunks も。手紙の引用は伏せる） | 404 |
| `GET /api/mood` | 今日の気分（無ければ null） | — |
| `PUT /api/mood` | 今日の気分を保存・上書き | 400 invalid_mood |
| `GET /api/moods?from&to` | 範囲の気分と記録件数（最大366日・AI なし） | 400 invalid_range |
| `GET /api/letters/current` | 今週の手紙の状態（ready / locked / generating / none） | — |
| `POST /api/letters/current` | 手紙の生成を始める（`202 generating`。裏で生成して保存。もう届いていれば `200 ready`） | 409 too_few_records / not_available、429 daily_limit、502 ai_failed |
| `GET /api/letters` | 過去の手紙一覧 | — |
| `GET /api/letters/[weekKey]` | 1通 | 404 |
| `PUT /api/letters/[weekKey]` | 既読にする | 404 |
| `DELETE /api/letters/[weekKey]` | 手紙を削除 | 404 |
| `GET /api/profile` | プロフィール（未設定なら null） | — |
| `PUT /api/profile` | merge で更新（nickname は trim→12字） | 400 invalid_body |
| `POST /api/deepdive` | 深掘りの1問（既存。quick は本文を `diary` として送る） | 既存（400 長さ不正、429 daily_limit、422 incomplete_response、502） |
| `POST /api/consult` | 相談（NDJSON。refs は `{ id, date, title, quote }`） | 既存（429 daily_limit など） |
| `DELETE /api/account` | `users/{uid}` を `recursiveDelete` | — |
| ~~`POST /api/shape`~~ | **削除**（56） | — |
| ~~`GET /api/record-chat`~~ | **削除**（80） | — |

共通のエラー：`401 app_check_failed`（App Check 不可）、`429 { error: "rate_limited", retryAfter }`（IP レート制限）。

## アプリシェル・ルーティング

- **モバイルネイティブ設計**：`max-w-[430px] h-dvh overflow-hidden` のシェルで PC でも中央にスマホ風に表示。基準 390×844・最小 375px。プロトタイプは絶対配置だが、実装は flex と相対配置で縦に収める
- **見た目**：革の机（`--color-felt`）の上に紙（`Paper`）・付箋・マスキングテープ。書体は5つ（Kiwi Maru・Yomogi・Klee One・Zen Kurenaido・Zen Maru Gothic）を `next/font` で読む
- **ナビゲーション**：下部タブバー（ホーム／記録／相談）。回転盤・一言・手紙・設定ではタブバーを隠す（`app/(full)/`）
- **操作**は画面下3分の1（親指の弧）に丸いアイコンのボタン（最小 54px・文字は小さく添えるだけ）。画面の下に説明文のフッターは置かない
- **viewport**：`viewport-fit=cover`。**PWA**：`app/manifest.ts`（`display: standalone`）。アイコン・起動画像は今回は作り直さない

| パス | 画面 | タブバー | 認証 |
|---|---|---|---|
| `/` | 起動画面（裏で自動ゲスト） | なし | 裏で用意 |
| `/mood` | 気分の回転盤（決定 → 3択） | なし | 必要 |
| `/mood/write` | 一言（長押しで保存） | なし | 必要 |
| `/home` | ホーム（挨拶・今週◯日・今週の便箋・今日の1枚・手紙のカード・歯車） | あり | 必要 |
| `/record` | 記録タブ（`?date=YYYY-MM-DD` で過去日モード） | あり | 必要 |
| `/search` | 相談タブ（文通。`?draft=` で入力欄に下書き） | あり | 必要 |
| `/letter` | 今週の手紙（`?week=` で過去の手紙） | なし | 必要 |
| `/settings` | 設定（アカウント・呼び名・音／振動／動き・規約・ログアウト・削除） | なし | 必要 |
| `/onboarding` | 廃止（`/settings` へ redirect） | — | — |
| `/terms` `/privacy` | 静的ページ | なし | 不要 |
| `/dev-login` | 開発専用 | なし | 不要 |

風の記録（月／年）は別ルートにせず、ホームのモーダルとして出す。

## 検索・相談フロー（スレッド単位の文通）

相談は**スレッド単位**。スレッド内では追い質問で続けられ、「新しい相談」で新しいスレッドを始める。過去のスレッドは履歴に残り、開いて再開できる。**スレッド間で文脈は混ぜない**（憲法第12条2項）。

1. **ユーザーが問いを書く**（マスキングテープの付箋。音声可・2000字まで）
2. **記録数チェック**：3件未満なら分析せず案内
3. **チャンク検索**（上記 RAG）：上位5件の記録の本人の言葉＋日付を取り出す。**会話は RAG に入れない**
4. **回答生成**：チャンク＋現在のスレッドのメッセージ（AI に渡すのは最大20件）を Claude に渡し、便箋に緑インクでストリーミング表示。下に「読み返したページ」（`refs` の付箋の小片・タップで全文）
5. **履歴保存**：`chats/{chatId}/messages` に保存

- スレッドの削除：履歴ドロワーから（確認あり）。`chats/{chatId}` を messages ごと完全削除
- 会話の内容はアプリの知識として蓄積しない。相談の結論に気づきがあれば、日記に残すよう回答の締めで促す（憲法第7条2項）
- 手紙の「相談する」→ `/search?draft=<文字列>`（入力欄に入れるだけで送らない）

## レート制限・コスト

- **公開範囲**：招待制は設けない（URL を知る人だけの非公開運用）。入口が自動ゲストなので、コスト保護は App Check・IP レート制限・ユーザー単位の日次クォータ・各社の spend limit で行う
- **日次クォータ**（`users/{uid}/usage/{YYYY-MM-DD}`・Asia/Tokyo）：判定と加算は `lib/db/usage.ts` の `consumeQuota` がトランザクションで原子的に行う。値は `lib/logic/limits.ts` で一元管理（憲法第17条）

| 種別 | 会員 | ゲスト | 超過 |
|---|---|---|---|
| 記録 `record`（full・quick とも） | 30件/日 | 3件/日 | `409 daily_limit` |
| 深掘り `deepdive` | 90回/日 | 9回/日 | `429 daily_limit` |
| 相談 `consult` | 30メッセージ/日 | 3/日 | `429 daily_limit` |
| 手紙 `letter`（やり直し込み） | 3回/日 | 1回/日 | `429 daily_limit` |

- ゲストは会員の 1/10（`guestLimit()`）。記録の枠は**書いた日基準**で、記録を削除しても戻らない。保存の失敗（embedding 失敗・`date_taken`・保存エラー）のときだけ返却する。AI は呼ぶ前に消費し、AI の失敗・不完全応答・早期エラーでは返却する
- 検索用メタの生成（57）は保存1回につき裏で1回なので、記録の上限（30件/日）がそのまま上限になる
- **運用ルール**：Anthropic / OpenAI の管理画面で**月額 spend limit を設定**しておく（最後の砦）
- **バックアップ**：`npm run backup`（`scripts/backup.mjs`）で Firestore 全データをローカル JSON に書き出す（出力先 `backups/` は gitignore 済み）
- **古いゲストの掃除**（PLAN 54）：Firebase Console で匿名アカウントの30日自動削除を有効にし、`scripts/cleanup-guests.mjs` で `users/{uid}` 以下も消す。画面の「30日使わないと消える」と一致させる

## 今週◯日・風の記録の判定基準

- タイムゾーンは **Asia/Tokyo 固定**、0時が日付境界。週は月曜はじまり
- 「記録あり」の日 = thoughts（full・quick）の日付 ∪ moods の日付（`recordedDays()`。**玉だけの日も1日**）
- ホームの「今週◯日」= 今週（月〜今日）の記録あり日数（`weekRecordDays()`）。`profile.hideStreak` で隠せる
- 直近の記録から3日以上空いたら「おかえり、◯◯さん」（`isWelcomeBack()`。責めない）
- 既存の `calcStreak`（連続日数）は残す
- 再会カード（今日の1枚）：記録5件以上で、1週間前／1か月前／最初に書いた日の記録を AI を使わずに選ぶ（`pickReunion()`）。本人の文章をそのまま引用する

## 削除の整合（憲法第13条）

- 記録の削除：thought と同じ `thoughtId` の chunks を全部消す（embedding ごと完全削除）。手紙は残し、その記録の引用だけ `deleted: true`・`quote: ""` にする（便箋の切れ端は「（消した記録）」）
- アカウント削除：`users/{uid}` を `recursiveDelete`（profile・thoughts・chunks・moods・letters・usage・chats・旧 recordChat まで）→ Auth ユーザーを削除
- 削除されたデータが AI の回答に影響する経路を残さない（RAG は chunks だけを見るので、chunks を消せば当たらない。手紙の伏せた引用は AI に再入力しない）

## 移行後の手順

（PLAN 60 が書く：移行完了後に旧6項目フィールドと旧 `thoughts.embedding`・旧ベクトルインデックスを消す手順。`scripts/cleanup-legacy-fields.mjs`）

## 憲法第19条のチェック（2026-10 の新機能）

対象：記録フローの変更（成形を裏へ・チャンク）、検索用メタ（57）、相談のチャンク検索（58）、気分の玉、一言の記録、週の手紙（75〜77）、下書き、自動ゲスト。

- [x] **第3〜7条（評価者にならない・記録主義・依存させない）**
  - 成形カードを無くし、画面に出るのは本人の文章と深掘りの質問・答えだけ。AI が本人の言葉を書き換えない（チャンクは分けるだけ・テストで一字一致を保証）
  - 相談・手紙の根拠は本人の言葉のチャンク＋日付だけ。メタ・気分・呼び名は AI 入力に入れない。手紙の引用は本人の文章の部分文字列であることをサーバーが検証する
  - 深掘りは1問のまま（quick にあとから足すときも1問）
  - 手紙は開いたときだけ・週1通・通知なし・日次上限あり。相談の30件/日は変えない（依存を助長しない）
  - **要確認（第6条1項）**：第6条1項は「6項目設計そのものの根拠」と書いてある。6項目への成形を画面から無くすので、条文の書き方を改める改正（第18条・ユーザー承認）が要るかを決める。「画面の本人の文章は AI が書き換えない」を憲法に明記するかも同じ
- [x] **第8〜10条（危機対応・診断しない・弱い立場への配慮）**
  - 新しい AI 呼び出し（メタ・手紙）も、システムプロンプトは共通部（セーフティ込み）＋機能別追記にする
  - 手紙の追記で、ネガティブを前向きに言い換えない・診断しない・悲観を上塗りしないことを定める（75 で承認）
  - **要確認（第8条2項）**：条文が「全 AI 呼び出し（深掘り・成形・相談）」と列挙している。成形が無くなりメタ・手紙が増えるので、列挙を直す改正が要る
- [x] **第11〜14条（誰が読めるか・RAG への混入・削除）**
  - 新しいデータ（chunks・moods・letters・usage の letter）はすべて `users/{uid}` の下。Firestore ルールとトークン検証の二重防御のまま
  - RAG の対象は chunks（本人の記録から作ったもの）だけ。会話・気分・手紙・自動の呼び名は入れない。下書きは端末内だけでサーバーに送らない
  - 記録削除で chunks も完全削除、手紙の引用は伏せる。アカウント削除は `recursiveDelete` で全部消える
  - 学習に使わない方針は変わらない。保存時暗号化は引き続き「他人に使ってもらう前に必須」（chunks の `text` も対象に含める）
  - **要確認（第12条1項・第13条2項）**：第12条1項「ベクトル検索の対象は thoughts のみ」を「thoughts とそこから作る chunks のみ」に、第13条2項の列挙（profile / thoughts / chats / recordChat）に chunks・moods・letters を足す改正が要る。quick のチャンクの `meta` に気分の一行が入る（検索の embedding だけ）ことを「気分は RAG に入れない」と両立させてよいかも確認する
- [x] **第15〜17条（人格の一貫性・適材適所・コスト上限）**
  - メタ・手紙のモデルは 57・75 で決め、リリース前に口調・危機対応を検証する
  - 手紙の上限（`letterPerDay`）・一言の文字数などの新しい数値は `limits.ts` にある。App Check と IP レート制限を足した
  - **要確認（第16条1項）**：「成形＝Sonnet 5 + Structured Outputs」の項が無くなる。メタ・手紙のモデルを書き足す改正が要る

上の「要確認」は、憲法の改正（第18条。ユーザーの明示的な承認）が要る点。承認されるまで、この文書は現行の憲法の範囲で設計している。

## MVP スコープ

> MVP（Phase 1〜11）は全タスク完了し、本番稼働中（https://mindwind.days-count.com）。Phase 12〜19（新 UI v5）の実装順は `docs/PLAN.md` が正。

### 含めない

- 複数言語対応
- データエクスポート
- ソーシャル機能・チーム機能
- AI の学習カスタマイズ
- 通知・リマインダー（手紙も通知しない）

## 今後の拡張

**優先度付きの最新バックログは `docs/PLAN.md`「将来やること」が正**（保存時暗号化〔他人に使ってもらう前に必須〕・記録データ取得のスケール対応など）。優先度未定のアイデア：

- 音声入力のサーバー側 STT 化（Whisper 等。Web Speech API の品質に不満が出た場合）
- データエクスポート
- ロゴからのアプリアイコン・起動画像・共有画像の作り直し

---

詳細な Claude プロンプト設計は `docs/mentor-prompt.md` を参照。
