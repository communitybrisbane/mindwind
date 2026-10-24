# シーケンス図：週の手紙（開いたときに生成）

スケジューラは使わない。手紙を開いた1回目に生成を始め、画面を閉じても裏で最後まで続ける。

```mermaid
sequenceDiagram
    actor U as 本人
    participant C as 画面(手紙)
    participant API as /api/letters/current
    participant DB as Firestore
    participant M as Claude Opus 4.8

    U->>C: ホームの手紙カードをタップ
    C->>API: GET
    API->>DB: 今週の手紙と記録日数を読む
    API-->>C: ready / locked / generating / none
    alt none(まだ書かれていない)
        C->>API: POST
        API->>DB: トランザクションで generating にする(二重生成を防ぐ)
        API->>DB: 手紙の利用枠を1つ消費
        API-->>C: 202 generating
        Note over API,M: 応答のあと after() で最後まで続ける
        API->>DB: 今週の記録を読む(本人の言葉のまま)
        API->>M: 共通部 + 手紙の追記 + 日付つきの記録
        M-->>API: 手紙(text と quote の並び)
        API->>API: 引用が本人の文章の部分文字列かを検証 / 危機の言葉の週は引用を落として窓口を案内
        API->>DB: ready で保存(今週の玉も一緒に)
        loop 生成が終わるまで
            C->>API: GET(ポーリング)
            API-->>C: generating
        end
        C->>API: GET
        API-->>C: ready と手紙
    end
    C->>U: 封が開く → 便箋
```

推測：「ポーリング」の間隔は画面側（`useLetter.ts`）による。本図では省いた。
補足：
- 今週3日以上の記録がないと `locked`（AI は呼ばない）。
- AI が使えない週（refusal・max_tokens・失敗）は、エラーではなく固定文の手紙（窓口の案内）を届ける。
- 止まった生成（6分超）は、作り直して前の利用枠を戻す。
