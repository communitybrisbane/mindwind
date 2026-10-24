# ER図：Firestore のデータモデル

すべてのデータは `users/{uid}` の下にある。クライアントから Firestore へ直接は読み書きせず（`firestore.rules` は全拒否）、API Routes が Admin SDK で読み書きする。
`PK` は文書 ID、`FK` は別の文書 ID を指す項目。Firestore は外部キー制約を持たないので、関係はアプリが守る。

```mermaid
erDiagram
    USERS ||--o{ THOUGHTS : "1人が複数の記録を持つ"
    USERS ||--o{ CHUNKS : "検索用の断片を持つ"
    USERS ||--o{ MOODS : "1日1つの気分を持つ"
    USERS ||--o{ LETTERS : "週ごとに1通の手紙を持つ"
    USERS ||--o{ CHATS : "相談スレッドを持つ"
    USERS ||--o{ USAGE : "1日の利用回数を持つ"
    THOUGHTS ||--|{ CHUNKS : "本文を分けて作る(1記録に1つ以上)"
    CHATS ||--o{ MESSAGES : "スレッドの発言"
    MESSAGES }o--o{ THOUGHTS : "refs で参照(スナップショット)"
    LETTERS }o--o{ THOUGHTS : "refs で引用(スナップショット)"

    USERS {
        string uid PK "Firebase Auth の uid(匿名も同じ)"
        map profile "nickname activity stage goal hideStreak"
    }
    THOUGHTS {
        string id PK
        string date "YYYY-MM-DD(Asia/Tokyo)"
        string rawText "本人の文章そのまま"
        string deepDiveQuestion "深掘りの質問(なければ空)"
        string deepDiveAnswer "深掘りの答え(なければ空)"
        string title "本文の先頭から自動(20字まで)"
        string kind "full か quick"
        string mood "quick のときの気分(MoodId)"
        timestamp createdAt
    }
    CHUNKS {
        string id PK "thoughtId_order"
        string thoughtId FK
        string date
        string text "本人の言葉そのまま(分けるだけ)"
        string source "diary か deepdive"
        int order "0始まり"
        string meta "検索用の1行(画面に出さない)"
        vector embedding "1536次元"
        timestamp createdAt
    }
    MOODS {
        string date PK "YYYY-MM-DD"
        string mood "追い風 そよ風 凪 向かい風 嵐"
        timestamp updatedAt
    }
    LETTERS {
        string weekKey PK "その週の月曜 YYYY-MM-DD"
        string from "週の月曜"
        string to "週の日曜"
        string status "generating ready failed"
        array blocks "text か quote の並び"
        array refs "thoughtId date quote deleted"
        array moods "月から日の7日分"
        int recordDays "記録があった日数"
        string model
        timestamp createdAt
        timestamp readAt "未読なら null"
    }
    CHATS {
        string id PK
        string title "最初の質問の先頭25字"
        timestamp createdAt
        timestamp updatedAt
    }
    MESSAGES {
        string id PK
        string role "user か assistant"
        string content
        array refs "id date title quote deleted"
        timestamp createdAt
    }
    USAGE {
        string dateKey PK "YYYY-MM-DD"
        int deepdive
        int consult
        int record
        int letter
        int meta
    }
```

推測：なし。型は `lib/db/types.ts`、保存先は各 API Route のコードから起こした。
補足：
- `THOUGHTS` には、移行完了まで旧6項目（event・thinking・action・reason・emotion・values）と旧 embedding が残る。図からは省いた。
- 記録を消すと、そのチャンクも消え、手紙・相談の `refs` は `deleted: true` で引用を伏せる（憲法第13条）。
- 下書きはサーバーに送らず、端末の localStorage だけにある。
