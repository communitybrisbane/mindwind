# 画面遷移図②：3タブと、まわりの画面

ホーム・記録・相談の3タブは、下のタブバーで行き来する。そこから出ていく画面と、戻る先を示す。

```mermaid
flowchart TD
    subgraph TABS["3タブ(下のタブバー・行き来できる)"]
        HOME["/home ホーム"]
        REC["/record 記録"]
        SEARCH["/search 相談"]
    end

    HOME -->|"歯車"| SETTINGS["/settings 設定"]
    HOME -->|"今日の玉をタップ"| WHEEL["/mood 回転盤"]
    HOME -->|"手紙カード"| LETTER["/letter 週の手紙"]
    HOME -->|"再会カードで相談する"| SEARCH
    HOME -->|"日付をタップして記録を開く"| REC

    REC -->|"長押しで保存"| HOME
    REC -->|"危機の言葉あり"| CRISIS["窓口の案内"]
    CRISIS -->|"丸ボタン"| HOME
    REC -->|"ゲストの上限"| SETTINGS
    SEARCH -->|"連携の案内"| SETTINGS

    LETTER -->|"とじる"| HOME
    LETTER -->|"相談する(下書きつき)"| SEARCH
    LETTER -->|"過去の週を選ぶ"| LETTER

    SETTINGS -->|"戻る"| HOME
    SETTINGS -->|"Googleと連携"| SETTINGS
    SETTINGS -->|"ログインし直す・退会"| SPLASH["/ スプラッシュ"]
    SETTINGS -->|"規約・プライバシー"| LEGAL["/terms /privacy"]
    LEGAL -->|"設定へ"| SETTINGS
```

推測：「ログインし直す・退会」の行き先は `AccountCard.tsx` の `router.replace("/")` による。`/onboarding` は `/settings` へ転送するだけ、`/dev-login` は開発用なので省いた。
