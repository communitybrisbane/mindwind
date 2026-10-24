# 状態遷移図：手紙（`letters/{weekKey}` と画面の状態）

画面が受け取る状態は `locked / none / generating / ready`。手紙のドキュメントに保存されるのは `generating` と `ready` のとき。

```mermaid
stateDiagram-v2
    [*] --> locked: 今週の記録が3日未満
    [*] --> none: 記録が3日以上・手紙がまだ無い
    locked --> none: 記録が3日に達した
    none --> generating: 開いて POST(利用枠を消費)
    generating --> ready: 生成・検証に成功して保存
    generating --> ready: 失敗したが危機の言葉のある週(固定文の手紙を保存)
    generating --> none: 失敗(作りかけを消して利用枠を戻す)
    generating --> generating: 6分以上止まっていたとき POST で作り直す
    ready --> ready: 初めて開く(readAt を記録)
```

出典：`app/api/letters/current/route.ts`（GET・POST・`generateLetter`）、`lib/db/letterStore.ts`（`decideBegin`・`GENERATING_STALE_MS` = 6分）。
補足：`LetterStatus` の型には `failed` があるが、コードのどこにも `failed` を書き込む処理は無い（保存値が未知のときの読み取りの既定値としてだけ使われる）。そのため図には入れていない。
