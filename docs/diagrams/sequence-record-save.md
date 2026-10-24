# シーケンス図：記録の保存（日記 → 深掘り → 保存 → 裏でメタ）

本人の文章は書き換えず、そのまま `thoughts` に保存する。検索用の1行メタは、保存の応答を返したあとに裏で作る。

```mermaid
sequenceDiagram
    actor U as 本人
    participant C as 画面(記録タブ)
    participant P as proxy.ts
    participant API as API Routes
    participant DB as Firestore
    participant O as OpenAI(embedding)
    participant H as Claude Haiku 4.5

    U->>C: 日記を書く(端末に下書き保存)
    C->>P: POST /api/deepdive(トークン付き)
    P->>P: IP回数制限 / App Check検証
    P->>API: 通す
    API->>DB: 深掘りの利用枠を1つ消費
    API->>H: 日記 + 共通部 + 深掘りの追記
    H-->>API: 質問1つ
    API-->>C: 質問
    U->>C: 答える(スキップ可) → 長押しで保存
    C->>API: POST /api/thoughts
    API->>DB: 記録の利用枠を1つ消費
    API->>O: 本文をチャンクに分けて embedding
    O-->>API: ベクトル
    API->>DB: トランザクションで thought と chunks を保存
    API-->>C: 完了(危機の言葉があれば crisis:true)
    C->>U: ホームへ(crisisなら窓口を案内)
    Note over API,H: 応答のあと after() で続行
    API->>H: 本人の言葉 + 日付(メタ生成の追記)
    H-->>API: 出来事・感情・場面の1行
    API->>O: 本文 + メタで embedding を作り直す
    API->>DB: 本文が変わっていなければ chunks のメタと embedding を更新
```

推測：なし。`app/api/deepdive/route.ts`・`app/api/thoughts/route.ts`・`lib/db/chunkStore.ts` から起こした。
補足：
- 一言（`quick`）はAIを呼ばず、気分から作った固定の1行をメタに入れる。裏のメタ生成は `full` だけ。
- 上限に達した日は、深掘りを飛ばして保存だけできる。
- 過去日に書いた記録は、その日にすでに記録があると 409（`date_taken`）で断る。
