# データ遷移図：本人の言葉が、どこへ流れ、どこに出るか

「本人の言葉」を一字も変えずに通す経路と、AI に渡してよいもの・渡さないものを分けて示す。

```mermaid
flowchart LR
    IN(["本人が書く<br/>日記 / 深掘りの答え / 一言"]) --> RAW["thoughts.rawText など<br/>(そのまま保存)"]
    MOODIN(["気分の玉を選ぶ"]) --> MOODS["moods/日付"]

    RAW -->|"分けるだけ(書き換えない)"| CHK["chunks.text"]
    RAW -->|"裏でAI(Haiku)が1行を作る"| META["chunks.meta<br/>(画面に出さない)"]
    MOODS -->|"quick の固定1行"| META
    CHK --> EMB["chunks.embedding<br/>(text + meta)"]
    META --> EMB

    EMB -->|"ベクトル検索"| CONSULT["相談の回答<br/>(Opus)"]
    CHK -->|"本人の言葉 + 日付だけ渡す"| CONSULT
    RAW -->|"今週分を日付つきで渡す"| LETTER["週の手紙<br/>(Opus)"]
    MOODS -->|"表示用に保存するだけ(AIには渡さない)"| LETTER

    CONSULT --> MSG["chats/messages<br/>(RAGには入れない)"]
    LETTER --> LDOC["letters/週<br/>(RAGには入れない)"]

    RAW --> SCREEN["画面に表示<br/>(本人の文章そのまま)"]
    MSG --> SCREEN
    LDOC --> SCREEN
    MOODS --> SCREEN

    DEL(["記録を削除"]) -.->|"chunks も削除"| CHK
    DEL -.->|"引用を伏せる(deleted)"| MSG
    DEL -.->|"引用を伏せる(deleted)"| LDOC
```

推測：なし。`docs/AI-CONSTITUTION.md`（第4・12・13条）・`docs/ARCHITECTURE.md`・各 API Route から起こした。
補足：AI に渡さないもの＝気分・メタ・題・自動の呼び名。危機の言葉の判定（`lib/logic/crisis.ts`）はAIを通らない経路にも掛かる（図には入れていない）。
