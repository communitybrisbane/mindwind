# 状態遷移図：手紙（`letters/{weekKey}` と画面の状態）

画面が受け取る状態は `locked / none / generating / ready`。保存される `status` は `generating / ready / failed`。

```mermaid
stateDiagram-v2
    [*] --> locked: 今週の記録が3日未満
    locked --> none: 記録が3日に達した
    [*] --> none: 記録が3日以上で、まだ書かれていない
    none --> generating: 開いて POST(利用枠を消費)
    generating --> ready: 生成と検証に成功して保存
    generating --> ready: AIが使えない週は固定文の手紙を保存
    generating --> none: 6分以上止まった(作り直しで枠を戻す)
    failed --> none: 作り直す
    ready --> ready: 初めて開く(readAt を記録)
    ready --> [*]: 翌週の土曜をすぎる(過去の手紙一覧へ)
```

推測：`failed` が作られる経路は、コード上は「失敗した手紙は未作成として扱う」（GET/POST が none とみなす）扱い。`failed → none` はその説明のための矢印。
