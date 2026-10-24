# 設計図

MindWind の設計を [Mermaid](https://mermaid.js.org/) で描いた図です。内容はコードで確かめた事実に基づきます。

## 図の一覧

| ファイル | 何の図か |
|---|---|
| [mindwind-diagrams.html](mindwind-diagrams.html) | 各図を1ページにまとめたもの（ブラウザで開く） |
| [er-firestore.md](er-firestore.md) | ER 図：Firestore のデータモデル（`users/{uid}` の下の構造） |
| [flow-screens-launch.md](flow-screens-launch.md) | 画面遷移図①：起動から気分の回転盤、ホームまで |
| [flow-screens-tabs.md](flow-screens-tabs.md) | 画面遷移図②：3 タブと、そこから出ていく画面 |
| [sequence-record-save.md](sequence-record-save.md) | シーケンス図：記録の保存（日記 → 深掘り → 保存 → 裏でメタ） |
| [sequence-consult.md](sequence-consult.md) | シーケンス図：相談（過去の記録を根拠に答える） |
| [sequence-letter.md](sequence-letter.md) | シーケンス図：週の手紙（開いたときに生成） |
| [flow-data.md](flow-data.md) | データ遷移図：本人の言葉の流れと、AI に渡すもの・渡さないもの |
| [arch-system.md](arch-system.md) | 構成図：システム全体 |
| [state-letter.md](state-letter.md) | 状態遷移図：手紙の状態 |

## 見方

- **HTML**：`mindwind-diagrams.html` をブラウザで開きます。図はブラウザで描かれるため、**ネット接続が必要**です（Mermaid を cdnjs から読み込んでいます）。接続がないと、図ではなく Mermaid の記述がそのまま表示されます。
- **Markdown**：各 `.md` は、GitHub 上で開くと図として表示されます。ローカルのエディタでは、Mermaid に対応したプレビューが要ります。
