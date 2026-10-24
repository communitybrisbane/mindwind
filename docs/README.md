# docs の地図

MindWind のドキュメント一覧です。「正」は食い違ったときに優先される文書、「参考」は経緯や補足です。優先順位は、AI に関することは `AI-CONSTITUTION.md` が最上位、名前・型・API・ファイルの持ち主は `IMPLEMENTATION-CONTRACT.md`、見た目と動きは `prototype/ui-v5.html` です（各文書の冒頭にも同じことが書いてあります）。

## ファイル一覧

| ファイル | 書いてあること | 誰向け | 正 / 参考 |
|---|---|---|---|
| [AI-CONSTITUTION.md](AI-CONSTITUTION.md) | AI に関する最高規範（本人の言葉を書き換えない、危機への対応など） | 全員・AI の仕様を知りたい人 | 正（最上位） |
| [mentor-prompt.md](mentor-prompt.md) | AI メンターの人格とプロンプトの実文（本番）。コードとテストで一致を確かめている | AI の仕様を知りたい人・開発者 | 正 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 技術設計（モデル選定・データモデル・フロー・レート制限） | 審査員・開発者 | 正（契約書と食い違えば契約書が優先） |
| [IMPLEMENTATION-CONTRACT.md](IMPLEMENTATION-CONTRACT.md) | 名前・型・API・ファイルの持ち主、決めたこと（新 UI v5 の実装契約） | 開発者 | 正 |
| [DESIGN-mindwind.md](DESIGN-mindwind.md) | 画面と動きの仕様（新 UI v5） | 審査員・開発者 | 正（食い違えばプロトタイプが優先） |
| [prototype/ui-v5.html](prototype/ui-v5.html) | ブラウザで触れる新 UI のプロトタイプ（390×844） | 審査員・開発者 | 正（見た目と動き） |
| [DEVELOPMENT.md](DEVELOPMENT.md) | セットアップ詳細・エラー処理・スコープ | 開発者 | 正 |
| [SECURITY-SETUP.md](SECURITY-SETUP.md) | ボット対策（App Check・IP レート制限）の設定手順 | 開発者・運用者 | 正 |
| [OPS-backfill-chunks.md](OPS-backfill-chunks.md) | 既存の記録から `chunks` を作る移行スクリプトの手順 | 運用者 | 正 |
| [OPS-guest-cleanup.md](OPS-guest-cleanup.md) | 30日使われていないゲストを掃除する手順 | 運用者 | 正 |
| [OPS-retention.md](OPS-retention.md) | 継続率を集計するスクリプトの手順 | 運用者 | 正 |
| [PLAN.md](PLAN.md) | 実装計画（1タスク = 1コミット）と進捗のチェック | 開発者 | 参考（進捗の記録。古い Phase には旧 UI の記述が残る） |
| [HANDOFF-ui-v5.md](HANDOFF-ui-v5.md) | 新 UI v5 実装時点の引き継ぎ（審査と修正の記録） | 開発者 | 参考（当時の記録） |
| [drafts/mentor-prompt-v5-drafts.md](drafts/mentor-prompt-v5-drafts.md) | v5 の AI 文面の下書きと承認の経緯。本番の正は `mentor-prompt.md` | AI の仕様を知りたい人 | 参考（経緯） |
| [diagrams/](diagrams/README.md) | 設計図（ER・画面遷移・シーケンス・データ遷移・構成・状態遷移） | 審査員・開発者 | 正（コードで確かめた事実） |
| [brand/](brand/) | ロゴとブランド素材（SVG・プレビュー・書き出し・生成スクリプト） | デザイン | 参考 |

## 読む順番

**審査員向け（目安 15 分）**
1. リポジトリの [README.md](../README.md)（何のアプリか・工夫）
2. [prototype/ui-v5.html](prototype/ui-v5.html) をブラウザで開いて画面を触る
3. [diagrams/mindwind-diagrams.html](diagrams/mindwind-diagrams.html)（全体の構成とデータの流れ）
4. [ARCHITECTURE.md](ARCHITECTURE.md)（技術の選び方）

**開発者向け**
1. [../CLAUDE.md](../CLAUDE.md)（開発の決まり）
2. [DEVELOPMENT.md](DEVELOPMENT.md)（セットアップ）
3. [ARCHITECTURE.md](ARCHITECTURE.md) → [IMPLEMENTATION-CONTRACT.md](IMPLEMENTATION-CONTRACT.md)
4. [DESIGN-mindwind.md](DESIGN-mindwind.md) と [diagrams/](diagrams/README.md)
5. 動かすとき：[SECURITY-SETUP.md](SECURITY-SETUP.md)、運用は `OPS-*.md`

**AI の仕様を知りたい人向け**
1. [AI-CONSTITUTION.md](AI-CONSTITUTION.md)（最高規範）
2. [mentor-prompt.md](mentor-prompt.md)（プロンプトの実文）
3. [diagrams/flow-data.md](diagrams/flow-data.md)（AI に渡すもの・渡さないもの）
4. 経緯：[drafts/mentor-prompt-v5-drafts.md](drafts/mentor-prompt-v5-drafts.md)
