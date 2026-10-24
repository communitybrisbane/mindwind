# 構成図：システム全体

ブラウザはFirestoreに直接つながない。すべて API Routes（Admin SDK）を通る。

```mermaid
flowchart LR
    subgraph Client["ブラウザ / PWA"]
        UI["Next.js 画面<br/>(3タブ・回転盤・手紙)"]
        LS["localStorage<br/>(下書き・表示設定)"]
        FA["Firebase Auth<br/>(自動で匿名ログイン)"]
        AC["App Check<br/>(reCAPTCHA Enterprise)"]
    end

    subgraph Vercel["Vercel(Next.js 16)"]
        PX["proxy.ts<br/>IP回数制限 + App Check検証"]
        API["API Routes<br/>thoughts deepdive consult<br/>letters moods mood<br/>profile chats account"]
        LIB["lib/ai ・ lib/db ・ lib/logic"]
    end

    subgraph Google["Google / Firebase"]
        AUTH["Firebase Authentication"]
        FS[("Firestore<br/>users/uid 以下")]
        RC["reCAPTCHA Enterprise"]
    end

    UP[("Upstash Redis<br/>回数の記録")]
    ANT["Anthropic API<br/>Haiku 4.5 / Opus 4.8"]
    OAI["OpenAI API<br/>text-embedding-3-small"]

    UI --> FA
    FA --> AUTH
    UI --> AC
    AC --> RC
    UI --> LS
    UI -->|"トークン + App Checkトークン"| PX
    PX --> UP
    PX --> API
    API --> LIB
    LIB -->|"IDトークン検証"| AUTH
    LIB -->|"Admin SDK"| FS
    LIB --> ANT
    LIB --> OAI
```

出典：`docs/ARCHITECTURE.md`・`docs/SECURITY-SETUP.md`・`proxy.ts`・`firestore.rules`。
補足：App Check は現在 `monitor`（検証は記録するだけで拒否しない）。Firestore のセキュリティルールは全拒否。
