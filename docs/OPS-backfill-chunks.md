# 既存データの移行：thoughts から chunks を作る（タスク 59）

`scripts/backfill-chunks.mjs` が、既存の記録（`users/{uid}/thoughts`）の `rawText`・深掘りから `users/{uid}/chunks/{thoughtId}_{order}` を作る。

## 何をするか

- 分け方は `lib/logic/chunk.ts` の `splitIntoChunks`（本人の言葉は一字も変えない。200〜400字目安・文の境界で分割・深掘りは `Q: …\nA: …` で1チャンク・quick は1チャンク）。
- quick で気分が残っている記録は、`moodMetaLine` の一行を `meta` に入れる。
- embedding は OpenAI `text-embedding-3-small`（1536次元）。入力は `meta` があれば `${text}\n${meta}`、なければ `text`。
- **旧 6 項目（event / thinking / action / reason / emotion / values）と旧 `embedding` は消さない。** 移行が全員分終わって検索が chunks に切り替わるまで残す（旧検索へのフォールバックも残す）。
- **冪等**：その記録のチャンクが 1 つでもあればスキップ。書くときは `create()` なので既存を上書きしない。途中で止まっても、もう一度実行すれば続きから作る。

## 手順

1. **バックアップ（必須）**：`npm run backup` → `backups/backup-<日時>.json` ができたことを確認。
2. **ドライラン**（既定・書き込みも OpenAI 呼び出しもなし）：
   ```bash
   node scripts/backfill-chunks.mjs
   ```
   「作成対象 N 件（チャンク M 個）」「作成済みでスキップ」の数が想定どおりか見る。
3. **本実行**：
   ```bash
   node scripts/backfill-chunks.mjs --apply
   ```
   1 ユーザーだけ試すときは `--uid=<uid>` を付ける（先に自分の uid で試すのを推奨）。
4. **確認**：もう一度ドライランして「作成対象 0 件」になること。Firestore で `chunks` が増えていること。
5. ベクトルインデックス（`chunks` コレクショングループ・`embedding`・1536次元・COSINE）が作成済みであること（DEVELOPMENT.md のコマンド）。未作成だと検索が動かない。

## package.json に足す行

```json
"backfill-chunks": "node scripts/backfill-chunks.mjs",
```

`npm run backfill-chunks -- --apply` の形でも実行できる。

## 注意

- Node 22.18 以上（型除去で `.ts` を直接読む）。現在の環境は v24。
- OpenAI の料金が発生する（記録数 × チャンク数ぶんの embedding）。
- 失敗したら：メッセージを確認して再実行する。壊れた場合は 1 の `backups/` から戻す。
- このスクリプトは実装時点で**実行していない**。実行はユーザーが行う。
