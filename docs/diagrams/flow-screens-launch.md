# 画面遷移図①：起動と気分の流れ

アプリを開いてから、ホームに着くまで。1日の最初だけ気分の回転盤を通る。矢印のラベルは「押したもの／起きたこと」。

```mermaid
flowchart TD
    START(["アプリを開く"]) --> SPLASH["/ スプラッシュ"]
    SPLASH -->|"タップ・今日の気分がまだ無い(1日の最初)"| WHEEL["/mood 気分の回転盤"]
    SPLASH -->|"タップ・今日の気分がある"| HOME["/home ホーム"]
    SPLASH -->|"ログインに失敗"| WHEEL
    WHEEL -->|"玉を決める(風の演出)"| CHOOSE{"どうする?"}
    CHOOSE -->|"一言を残す"| QUICK["/mood/write 一言"]
    CHOOSE -->|"日記を書く"| REC["/record 記録"]
    CHOOSE -->|"今日はここまで"| HOME
    QUICK -->|"残す"| HOME
    QUICK -->|"危機の言葉あり"| CRISIS["窓口の案内ダイアログ"]
    CRISIS -->|"丸ボタン"| HOME
```

出典：`components/splash/Splash.tsx`（`nextRoute`・`authError` の分岐）、`app/mood/page.tsx`、`app/mood/write/page.tsx`。「1日の最初」は、今日の気分が無く、端末に記録した日付が今日でないとき。
