# 引き継ぎ：新しい UI（v5）Phase 12〜19（2026-10-24）

PLAN の Phase 12〜19（タスク 40〜84）を 4 つの観点（憲法・プロトタイプとの一致・コードの品質・PLAN との整合）で審査し、high と medium の指摘を直した状態の引き継ぎです。進捗の正は `docs/PLAN.md`、決めたことの正は `docs/IMPLEMENTATION-CONTRACT.md` §8。

検証：`npx tsc --noEmit` エラーなし／`npx vitest run` 43 ファイル・380 テスト通過／`npx eslint`（変更したファイル）エラーなし／`npm run build` 成功。

---

## 1. できたこと（コードは入っていて、動く）

| 範囲 | 中身 |
|---|---|
| 土台（41〜47） | フォント・色・革の机・紙・丸ボタン・鉛筆アイコン・気分の玉・フィードバック（振動／音／動きをへらす）・文字数カウンター・タブバー・ストリーク表示ロジック |
| 入口と設定（48〜51） | 起動画面 → 自動ゲスト開始（匿名ログイン）・自動の呼び名（AI には渡さない）・設定画面・Google 連携とログインし直し・歯車の赤い点 |
| ボット対策のコード（52〜54） | `proxy.ts` に IP レート制限と App Check の検証。古いゲストの掃除スクリプト。**設定は本人（§3）** |
| 成形を裏へ（55・56・60） | チャンク分割・保存 API の新形式（本人の文章＋深掘りをそのまま保存・チャンクごとに embedding）・削除の整合 |
| 相談の RAG（58 のコード部分） | **今回修正**。`chunks` を `findNearest` → 記録単位にまとめて上位5件 → 類似度しきい値 → 本人の言葉＋日付だけを AI に渡す。インデックスが無い間は全件読み、チャンクが1つも無い人（移行前）は旧検索にフォールバック。各段階の時間をログに出す |
| 気分（61〜64） | 気分のデータモデル・保存 API・`useTodayMood`・回転盤・3択・一言の保存 |
| 記録タブ（66〜68） | 罫線ノート・深掘りの1問・長押しで封をして保存・しおり・保存済みの表示と編集・下書きの端末内保存 |
| 相談タブ（69・70） | 文通 UI・伸びる入力欄・読み返したページ（付箋の小片 → 紙のモーダル） |
| ホームと風の記録（71〜74） | 再会カード・今週の便箋・手紙のカード・風の記録（月／年・日のモーダル） |
| 手紙の画面（76・78） | 週の境界・データモデル・封筒 → 引っぱり出す → 三つ折り。**本文を作る API はまだ無い（§2）** |
| 仕上げ（80〜84） | 旧 UI の整理・アクセシビリティ・継続率の計測スクリプト・起動画面・風の強さで変わる雰囲気 |

### 今回（最終修正）で直したこと

1. **相談が新しい記録を見ていなかった（high）**：`lib/ai/rag.ts` が旧 `thoughts.embedding` だけを見ていて、新形式で保存した記録（embedding は `chunks` にだけある）が参考記録に一切出なかった。チャンク検索に切り替え、参考ブロックを「本人の言葉＋日付」に、`refs` を `{ id, date, title, quote }` に変えた。関連する記録が0件のときは空のブロックではなく「見つからなかった」の一行を渡す（憲法第4条2項）。
2. **記録を消しても相談の履歴に写しが残っていた（medium・憲法第13条）**：`DELETE /api/thoughts/[id]` が、先に相談の「読み返したページ」の写しと手紙の引用を伏せてから（`lib/db/scrubDeleted.ts`）、記録とチャンクを消すようにした。画面は「（消した記録）」と出す。
3. **アカウント削除で端末の下書きが残っていた（medium）**：アカウント削除・ログアウト・ログインし直しで `mindwind:` の localStorage（下書き・再会カードの印・回転盤の印・赤い点の印）と sessionStorage を消す（音・振動の好みは残す）。プライバシーポリシーにも書いた。
4. **本番の設定もれで費用がむき出しになる（medium）**：本番で `ENFORCE_APP_CHECK=enforce`・reCAPTCHA の鍵・Upstash が無いと、最初のリクエストで1回だけ `[production-config] …` を警告する（止めない）。`docs/SECURITY-SETUP.md` に「公開前チェック」を追加。
5. **相談の失敗で空スレッドが残る（medium）**：Claude の呼び出しが失敗したら、この呼び出しで作ったスレッドを消す。問い・返事・更新時刻は1バッチで書く。
6. **記録の編集の競合（medium）**：embedding を作っている間に別の画面が同じ記録を直していたら、書かずに `409 conflict` を返す。画面は「開き直してから、もう一度」と出す。

---

## 2. 承認待ち（AI の文面。承認前にコードは書かない）

下書きは `docs/drafts/mentor-prompt-v5-drafts.md`。承認されたら `docs/mentor-prompt.md` に一字も変えずに写し、`lib/ai/mentorPrompt.ts` に転記する。

| タスク | 何を承認するか | いまの状態 |
|---|---|---|
| 57 検索用メタの生成 | メタ生成用の追記（下書き §1） | コード未着手。quick のメタ（気分の一行）だけは AI を呼ばずに付けている |
| 58 相談の追記の改訂 | ★3行の追加・変更（下書き §2）。「Q は本人の言葉ではない」「言い換えた文を本人の言葉として書かない」など | **コード側は実装済み**。システムプロンプトは現行のまま（追記の承認後に転記） |
| 75 手紙用プロンプト | 手紙用の追記（下書き §3）とモデル（下書き §4・§5 の A〜G） | 未着手 |
| 77 手紙の生成 API | 75 が先 | 未着手。`app/api/letters/*` が無いので、本番の手紙は「日曜日に届くよ」のまま、開発ではサンプルの手紙 |

承認のついでに決めること：PLAN 40 の「決める点」（一言の上限 60／最短 2・年のビューの点・タイトルの作り方・新ホームから一覧とカレンダーを外す）は、`IMPLEMENTATION-CONTRACT.md` §8 の既定値で実装済み。それでよければ 40 にチェックを。

---

## 3. ユーザーの作業（エージェントにはできないこと）

順番に。手順の詳細は各ドキュメント。

1. **バックアップ**：`npm run backup` → `backups/backup-<日時>.json` ができたことを確認
2. **既存データの移行（59）**：`node scripts/backfill-chunks.mjs`（ドライラン）→ 件数を見て `node scripts/backfill-chunks.mjs --apply`（まず `--uid=<自分の uid>` で1人試すのを推奨）→ もう一度ドライランで「作成対象 0 件」。`docs/OPS-backfill-chunks.md`
3. **ベクトルインデックス（58）**：`gcloud` でプロジェクトを選んで
   ```bash
   gcloud firestore indexes composite create --collection-group=chunks --query-scope=COLLECTION --field-config=vector-config='{"dimension":"1536","flat": "{}"}',field-path=embedding --database="(default)"
   ```
   無い間は全件読みで動く（遅いだけ）。相談のログ `[consult] … source=chunks` になれば効いている。`docs/DEVELOPMENT.md`
4. **App Check（52）**：Google Cloud で reCAPTCHA Enterprise のキーを作る → Firebase Console の App Check に登録 → Vercel に `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` と `ENFORCE_APP_CHECK=monitor` → 数日ログを見て `enforce` → Console の「API」タブで Authentication と Firestore を「適用」。`docs/SECURITY-SETUP.md` A
5. **Upstash（53）**：Redis を作って Vercel に `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`。`docs/SECURITY-SETUP.md` B
6. **古いゲストの掃除（54）**：Firebase Console → Authentication → 設定で匿名アカウントの30日自動削除を有効に。Firestore 側は `npm run cleanup:guests`（ドライラン → `--apply`）。`docs/OPS-guest-cleanup.md`
7. **公開前チェック**：`docs/SECURITY-SETUP.md`「公開前チェック」の 6 項目。Vercel のログに `[production-config]` が出ていないこと
8. **実機確認（81・84・63・48）**：iPhone Safari と Android Chrome で全画面。回転盤の弾き・粒子の重さ・「動きを減らす」・既存の Google ユーザーがそのまま入れること
9. **継続率**：`npm run retention`（読み取り専用）。`docs/OPS-retention.md`

---

## 4. 決めたこと（既定値。変えるなら契約 §8 を直してから）

| こと | 既定値 | どこ |
|---|---|---|
| 一言（quick）の文字数 | 上限 60・最短 2 | `lib/logic/limits.ts` |
| 参考記録のしきい値 | コサイン類似度 0.3 未満は落とす。1記録 800 字（チャンクの境界で切る）。0件なら「見つからなかった」の一行 | `lib/logic/ragChunks.ts` |
| 旧データのフォールバック | チャンクが1つも無い人だけ、旧 `thoughts.embedding` を検索。移行が済めば使われない | `lib/ai/rag.ts` |
| 記録削除と相談の履歴 | 「読み返したページ」の写しは `{ id, date, deleted: true }` に伏せる。返事の本文は残す（本人が受け取った会話。消したければスレッドごと） | `lib/db/scrubDeleted.ts` |
| 記録削除と手紙（79） | 手紙は残し、引用だけ伏せる（`deleted: true`・quote 空・「（消した記録）」） | 同上・`components/letter/Slip.tsx` |
| アカウント削除・ログアウトと端末 | `mindwind:` の localStorage と sessionStorage を消す。`mindwind:prefs` は残す | `lib/ui/localData.ts` |
| 編集の競合 | 読んでから書くまでに変わっていたら `409 conflict`。自動で再実行はしない | `app/api/thoughts/[id]/route.ts` |
| 本番の設定もれ | 止めずに警告（1回） | `lib/api/productionGuard.ts` |
| 手紙 | 週に記録 3 日以上で書く。日曜に開けられ翌土曜まで。開いたときに生成 | `lib/logic/week.ts`・`limits.ts` |
| 再会カード | 記録 5 件以上。1日1回。7日前／30日前／最初の日 | `lib/logic/reunion.ts` |
| 歯車の赤い点 | ゲストだけ。設定を開いたら消え、7日たつとまた出す | `lib/ui/useSettingsSeen.ts` |

---

## 5. 既知の問題（直していないこと）

- **手紙の本文が無い**：77 が未着手（75 の承認待ち）。本番では手紙のカードが「日曜日に届くよ」のまま、`/letter` は「届いていない」表示。開発ではサンプルの手紙が出る（`IS_DEV`）。
- **相談のシステムプロンプトは現行のまま**：58 の★3行（渡される記録が抜き出しであること・Q は本人の言葉でないこと・言い換えを本人の言葉として書かないこと）は承認待ち。コード側は本人の言葉を渡しているので、承認までの間、AI が Q を本人の言葉として引く可能性がある。
- **移行前の記録には 6 項目の成形文が渡る**：チャンクが1つも無い人のフォールバックでは、`rawText` が無い古い記録は旧6項目を本人の言葉の代わりに渡す（AI が書いた文）。59 の移行を済ませれば解消。
- **65 未着手**：一言の表示は崩れないが、quick 記録から「あとから深掘りする」入口が無い。
- **設定画面を直接開いても赤い点が消えない（low）**：歯車から開いたときだけ消える。記録タブ・相談タブの「Googleでつなぐ」リンクから開くと残る。`app/settings/page.tsx` の `Settings()` で `markSettingsSeen()` を呼べば直る。
- **匿名ログイン失敗の再試行が無い（low）**：`lib/ui/useEnsureUser.ts` は失敗すると固定のエラー文で止まり、ページを開き直すまで戻らない。
- **手紙の生成 POST に AbortController が無い（low）**：77 と一緒に。
- **ボタンの最小サイズ（low）**：記録タブ上部のしおりチップ（30px）・月／年の切り替え（46px）・今日の玉（40px）は 54px 未満。プロトタイプと同じ大きさなので、厳密にするかは本人判断。
- **`/api/letters/current` がレート制限の AI ルール一覧に先に入っている**：ルートができたときにそのまま効く（害はない）。
- **アプリアイコンの変更がコミットされていない**：`app/icon.svg`・`public/icon-192.png`・`public/icon-512.png`・`app/apple-icon.png`・`docs/DESIGN-mindwind.md` §12 が作業ツリーに残っている（この引き継ぎの作業では触っていない。本人が確認してコミット）。
- **プッシュしていない**：すべてローカルのコミット。push＝本番デプロイなので本人が確認してから。
