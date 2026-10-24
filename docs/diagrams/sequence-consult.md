# シーケンス図：相談（過去の自分の記録を根拠に答える）

AI に渡すのは、本人の言葉のチャンク（日付つき）と相談の文だけ。気分・メタ・題・呼び名は渡さない。

```mermaid
sequenceDiagram
    actor U as 本人
    participant C as 画面(相談タブ)
    participant API as POST /api/consult
    participant DB as Firestore
    participant O as OpenAI(embedding)
    participant M as Claude Opus 4.8

    U->>C: 質問を送る
    C->>API: message と chatId(あれば)
    API->>DB: 相談の利用枠を1つ消費
    alt 上限に達した
        API-->>C: 429 daily_limit
    end
    API->>DB: スレッドの履歴を読む(直近20件)
    API->>O: 直前の発言 + 今回の質問で embedding
    API->>DB: chunks をベクトル検索(上位5記録・しきい値0.3)
    alt 検索結果が3件未満
        API->>DB: 利用枠を戻す
        API-->>C: 409 not_enough_records
    end
    API->>DB: スレッドがなければ作る
    API-->>C: chatId と参考にした記録(refs)
    API->>M: 共通部 + 相談の追記 + 履歴 + 本人の言葉と日付 + 質問
    M-->>API: 回答(ストリーム)
    API-->>C: 回答を少しずつ送る
    API->>DB: 質問と回答を messages に保存(refs つき)
    C->>U: 回答 + 参考にした記録
```

出典：`app/api/consult/route.ts`・`docs/DEVELOPMENT.md`（フォールバック）。
補足：
- チャンクがない人は、旧 `thoughts.embedding` の検索にフォールバックする。
- 失敗したときは利用枠を戻し、作ったばかりの空のスレッドは消す。
- 会話（`messages`）は RAG に入れない。
