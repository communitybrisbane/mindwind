# MindWind - UI/UX Design Specification

Starbucks Design System を参考にした、新卒社会人向け AI メンターアプリの UI/UX 仕様書です。

---

## 1. Visual Theme & Atmosphere

MindWind は Starbucks のカフェの雰囲気を継承しながら、「**自分の思考を整理し、成長パターンを認識する**」というコンセプトを表現します。

- **Warm, Introspective** - カフェで落ち着いて考え込む感じ
- **Confidence in Self** - 自分の判断基準に気付く瞬間
- **Continuity Visible** - 毎日の積み重ねが見える
- **Mature & Professional** - 新卒社会人が毎日使うツールとしての落ち着き。幼稚さを排除し、信頼感のあるデザイン
- **Minimal Text, Visual Communication** - テキストを最小限に抑え、アイコン・レイアウト・色で情報を伝える

色は Starbucks Green（`#006241`）を中心に、クリーム背景でカフェの温もり感を保ちます。

**Key Characteristics:**
- Starbucks Green (`#006241` / `#00754A`) を brand color として統一
- Warm-neutral canvas (`#f2f0eb` / `#edebe9`) で落ち着き感
- 12px radius buttons（mature look）+ `scale(0.95)` active state
- 12px card radius + whisper-soft shadows
- SVG line icons（stroke-width: 1.5〜2px）を使用。絵文字(emoji)はUIアイコンとして使わない
- Rem-based spacing (1rem = 10px)
- カレンダーと連続日数で「継続」を可視化

---

## 2. Color Palette

### Primary Colors

| Color | Hex | Role |
|-------|-----|------|
| **Starbucks Green** | `#006241` | H1 headings, brand signal, primary brand moments |
| **Green Accent** | `#00754A` | Primary CTA buttons, filled states |
| **House Green** | `#1E3932` | Feature bands, footer, dark surfaces |
| **Green Light** | `#d4e9e2` | Valid form states, light backgrounds |

### Surface & Background

| Color | Hex | Role |
|-------|-----|------|
| **Neutral Warm** | `#f2f0eb` | Primary page canvas |
| **Ceramic** | `#edebe9` | Section separators, soft washes |
| **White** | `#ffffff` | Card surfaces, modals |
| **Neutral Cool** | `#f9f9f9` | Dropdown menus, quiet utility |

### Text Colors

| Color | Role |
|-------|------|
| `rgba(0, 0, 0, 0.87)` | Primary text (headings, body on light) |
| `rgba(0, 0, 0, 0.58)` | Secondary text (metadata, captions) |
| `rgba(255, 255, 255, 1)` | Primary text on dark surfaces |
| `rgba(255, 255, 255, 0.70)` | Secondary text on dark surfaces |

### Semantic

| Color | Role |
|-------|------|
| `#c82014` (Red) | Error, destructive states |
| `#fbbc05` (Yellow) | Warning states |

---

## 3. Typography

### Font Family

- **Primary**: `Inter, Manrope, "Helvetica Neue", sans-serif`
  - 理由：SoDoSans は proprietary。Inter / Manrope が最も近い humanist geometric
  - Starbucks と同じ tight tracking `-0.01em` で自信を持った読み心地
- **Reading Serif** (記録詳細の引用時): `"Iowan Old Style", Georgia, serif`
- **Fallback**: `"Helvetica Neue", Helvetica, Arial, sans-serif`

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|--------|-------------|----------------|-------|
| Display (H0) | 4.5rem / 45px | 600 | 1.2 | -0.01em | Dashboard "ダッシュボード" など大見出し |
| H1 | 24px | 600 | 36px | -0.01em | Starbucks-Green color, section headers |
| H2 | 24px | 400 | 36px | -0.01em | Regular-weight section title |
| Body Large | 19px | 400 | 33.25px | -0.01em | Hero intro, feature-band body |
| Body | 16px | 400 | 24px | -0.01em | Default body copy |
| Small | 14px | 400-600 | 21px | -0.01em | Button label, form labels, metadata |
| Micro | 13px | 400 | 19.5px | -0.01em | Caption, helper text |

**Principles:**
- Weight shifts carry hierarchy, not size shifts
- Text never pure black -- `rgba(0,0,0,0.87)` for warmth
- Rem-based scale anchored at `1rem = 10px`
- Tight `-0.01em` tracking on all text

---

## 4. Spacing System

Rem-based semantic scale (1rem = 10px):

| Token | Rem | Pixels | Use |
|-------|-----|--------|-----|
| `--space-1` | 0.4rem | 4px | Tightest inline padding |
| `--space-2` | 0.8rem | 8px | Small gap, button vertical padding |
| `--space-3` | 1.6rem | 16px | Default -- card padding, outer gutter xs |
| `--space-4` | 2.4rem | 24px | Section inner spacing, outer gutter md |
| `--space-5` | 3.2rem | 32px | Major between-section spacing |
| `--space-6` | 4rem | 40px | Large gaps, outer gutter lg |
| `--space-7` | 4.8rem | 48px | Section-to-section spacing |
| `--space-9` | 6.4rem | 64px | Widest section padding |

**基準フレーム:**
- モック・デザインの基準サイズは **390×844**（iPhone 12〜16 標準の論理解像度）
- アプリシェルの max-width は 430px（それ以上は中央寄せ）。検証最小幅は 375px（iPhone SE）

**Gutter Tokens:**
- Mobile (xs): `--outerGutter: 1.6rem` (16px)
- Tablet (md): `--outerGutterMedium: 2.4rem` (24px)
- Desktop (lg): `--outerGutterLarge: 4.0rem` (40px)

---

## 5. Component Specifications

### Buttons

**1. Primary Filled CTA**
- Background: `#00754A` (Green Accent)
- Text: `#ffffff`, 14-16px, weight 600
- Border: `1px solid #00754A`
- Radius: `12px`
- Padding: `12px 24px`
- Active: `transform: scale(0.95)`
- Transition: `all 0.2s ease`
- Use: 記録の保存ボタン、成形カード下の保存、オンボーディングの「はじめる」など。**アクション系ボタンは原則テキストなしのアイコンのみ**（✨=AIに処理してもらう／✏=記録として保存／スパイラル=はじめる）+ `aria-label`

**2. Primary Outlined**
- Background: transparent
- Text: `#00754A`, 14-16px, weight 600
- Border: `1px solid #00754A`
- Same radius, padding, active, transition as Primary Filled
- Use: Secondary actions on feature bands

**3. Outlined on Dark (on House Green band)**
- Background: transparent
- Text: `#ffffff`, 14px, weight 600
- Border: `1px solid #ffffff`
- Use: Secondary actions on dark-green bands

### Cards

**Content Card (default)**
- Background: `#ffffff`
- Radius: `12px`
- Shadow: `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)`
- Padding: `16-24px` (`--space-3` to `--space-4`)
- Use: 成形カード, 相談の AI 回答バブル, 参考記録リスト, ダッシュボード要素

**Feature Band (House Green)**
- Background: `#1E3932` (House Green)
- Text: `#ffffff` (heading), `rgba(255,255,255,0.70)` (body)
- Full-width section
- Padding: `32px` vertical
- Use: ストリークダッシュ, 記録完了メッセージ, パターン分析結果

**Light Background Card**
- Background: `#f2f0eb` (Neutral Warm) or `#edebe9` (Ceramic)
- Use: Alert zones, utility sections, page canvas

### Inputs & Forms

**Text Input / Textarea**
- Background: `#ffffff`
- Border: `1px solid #d6dbde` (input border)
- Radius: `4px`
- Padding: `12px`
- Focus: border -> `#00754A` (Green Accent), `box-shadow: 0 0 0 2px rgba(0, 117, 74, 0.1)`
- Font: 16px, weight 400, `rgba(0,0,0,0.87)`
- Placeholder: `rgba(0,0,0,0.38)`

**Floating Label (optional)**
- Label floats above input when focused/filled
- Desktop: 19px -> 14px
- Mobile: 16px -> 13px
- Horizontal offset: 12px
- Active translate: -12px Y with -50% transform
- Font: weight 600, `rgba(0,0,0,0.87)`

**Form Valid State**
- Border: `1px solid #d4e9e2` (Green Light)
- Background tint: `rgba(212, 233, 226, 0.33)`

**Form Invalid State**
- Border: `1px solid #c82014` (Red)
- Background tint: `hsl(4 82% 43% / 5%)`

### Icons

**SVG Line Icons (全画面共通)**
- Style: stroke-based line icons（塗りなし）
- Stroke width: `1.5px`（ナビ）〜 `2px`（コンテンツ内）
- Color: 親要素の `currentColor` を継承
- Size: `24px`（ナビ・タブバー）、`16px`（インライン）、`32px` 丸ボタン内 `16-24px`
- 絵文字(emoji)をUIアイコンとして使わない。全てSVGで統一

**必要なアイコン一覧:**
- ナビ: ホーム(ブランドのスパイラル)、記録(積み上がるブロック)、相談(message-circle)
- ダッシュボード: 火(flame/streak)、カレンダー(calendar)、シェブロン(chevron-down/up)、設定(gear・Hero右上)
- 記録: マイク(mic)、sparkles(AI処理)、鉛筆(保存)、ローディング(loader)
- 相談: 送信(send)、マイク(mic)、時計(相談履歴)、プラス(新しい相談)、ペーパークリップ(参考にした記録チップ)、✕(モーダル閉じる)

### Navigation

**Top Header (fixed)**
- Height: `48px`
- Background: `rgba(255,255,255,0.8)` + `backdrop-filter: blur(10px)`
- Content: スパイラルマーク + "MindWind" brand text（center）
- Font: 16px, weight 600, Starbucks Green
- **表示するのはホーム（`/home`）とオンボーディング（`/onboarding`）のみ**。スタート画面（`/`）・記録（`/record`）・相談（`/search`）では非表示（チャット系画面は縦のスペースを優先し、画面を無駄にしない）

**Bottom Tab Bar (fixed)**
- Height: `56px`
- Background: `#ffffff`
- Border-top: `1px solid #edebe9`
- 3 tabs: ホーム / 記録 / 相談
- Each tab: **SVG icon のみ（24px、ラベルなし）** — ホーム=家、記録=積み上がるブロック、相談=スパイラル（アプリアイコン）
- Active state: Starbucks Green icon
- Inactive state: `rgba(0,0,0,0.38)` icon
- Touch target: minimum `44px` height per tab
- スタート画面（`/`）では非表示

### Elevation & Depth

| Level | Shadow | Use |
|-------|--------|-----|
| Card | `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)` | Default cards |
| Header | `backdrop-filter: blur(10px)` | Top header |
| Tab Bar | `border-top: 1px solid #edebe9` | Bottom tab bar |
| Floating CTA | `0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)` | Floating buttons |

---

## 6. App Shell & Routing

### モバイルネイティブ設計

MindWind はモバイルファーストの Web アプリとして、PC でもスマホアプリのような体験を提供する。

**アプリシェル:**
- `max-width: 430px` で固定、PC ブラウザでは中央配置
- `body { display: flex; justify-content: center }` で中央寄せ
- アプリシェルに `shadow` を付与してフレーム感を演出
- `viewport-fit=cover` で iPhone ノッチ対応

**ナビゲーション:**
- 上部ヘッダー: 48px、`backdrop-blur`、ブランド名のみ
- 下部タブバー: 56px、SVG アイコンのみ（ホーム=家/記録=ブロック/相談=スパイラル）
- スタート画面（`/`）ではナビ非表示

**ルーティング:**

| パス | 画面 | ナビ | 説明 |
|------|------|------|------|
| `/` | スタート画面 | なし | ロゴ + タグライン + 「Google ではじめる」CTA（Google ログイン） |
| `/home` | ダッシュボード | あり | ストリーク、カレンダー、最近の記録 |
| `/record` | 記録 | あり | 3フェーズ記録フロー |
| `/search` | 相談 | あり | パターン分析 + アドバイス |

---

## 7. Screen Specifications

### Start Page (`/`)

**Layout:**
- ナビなし、全画面表示
- 縦中央: ロゴアイコン + "MindWind"（タグラインは置かない）
- 下部: 「Google ではじめる」ボタン（Primary Filled, 角丸 12px）+ 規約同意テキスト
  - タップで Google ログイン（Firebase Authentication）→ 成功後 `/home` へ遷移
  - ログイン失敗時はエラートーストを表示
- **規約同意テキスト（ボタン直下）:**
  - 文言: "利用規約・プライバシーポリシーに同意して続行"（最短の1行表現）
  - Font: 12px, `rgba(255,255,255,0.65)`、中央揃え
  - "利用規約" と "プライバシーポリシー" はリンク（`rgba(255,255,255,0.9)`, underline）。`/terms` と `/privacy` の静的ページへ遷移（ログイン不要で閲覧可能）
  - ページの中身（規約本文）の作成は MVP スコープ外。プレースホルダーページを用意する
- 余計なテキストは置かない

---

### Onboarding Page (`/onboarding`)

初回ログイン後に表示するプロフィール登録画面。**スキップ可**（「あとで入力する」リンク）。ホームの Hero カード右上の設定（歯車）アイコンから編集モードとして再表示できる。

**Layout:**
- タイトル: "はじめまして"（24px, weight 600, Starbucks Green）
- サブテキスト: "あなたに合った答えを返すために、少しだけ教えてください"（14px, secondary）
- 4つのフィールド（縦積み、間隔 22px）:
  1. **呼び名** — テキスト入力（例：ゆう）
  2. **いましていること**（補足ラベル "仕事や学業など"）— テキスト入力（例：営業／大学生）
  3. **いまのステージ** — 選択チップ：学生 / 社会人1年目 / 2年目 / 3年目以上（単一選択。選択中は Green Accent 塗り・白文字）
  4. **いまの目標・課題**（補足ラベル "任意・あとからでOK"）— テキスト入力（例：仕事に早く慣れたい）
- ラベル: 13px, weight 600。補足は tertiary の小さめテキスト
- 下部: 進むボタン（**ブランドのスパイラル SVG**・Primary Filled・Full width, `aria-label="はじめる"`）+ "あとで入力する" テキストリンク（13px, secondary, underline, 中央）

**編集モード（Hero の歯車から表示。設定画面を兼ねる）:**
- タイトルは "プロフィール"、サブテキストは "いつでも変更できます"。各フィールドは保存済みの値が入った状態
- 「あとで入力する」リンクは表示しない
- 保存ボタン（スパイラル・`aria-label="保存する"`）の下に区切り線を挟んで**アカウント管理**を表示:
  - **ログアウト** — テキストリンク（14px, secondary, 中央）
  - **アカウントを削除** — テキストリンク（14px, `#c82014`, 中央）。保存ボタンから最も遠い最下部に置き誤タップを防ぐ
  - 削除タップ → 確認ダイアログ（"アカウントを削除しますか？ すべての記録・相談履歴が完全に削除され、元に戻せません" ＋ 赤の削除/キャンセル）→ Google 再認証 → 削除実行
- 全項目任意。未入力のままでもアプリの全機能が使える（プロフィールは AI プロンプトへの注入にのみ使用）

**プロフィールの利用先:**
- 相談・深掘り質問のシステムプロンプトに固定文として注入（詳細は ARCHITECTURE.md）
- ホームの挨拶: nickname があれば "こんにちは、{nickname}さん"

---

### Dashboard / Home Page (`/home`)

**Layout:**
- 時間帯に応じた挨拶（おはようございます / こんにちは / おつかれさまです）+ 日付
- 3-section layout（全て1カラム、縦積み）:
  1. Streak Display (コンパクトインラインカード)
  2. Calendar (ミニマルグリッド)
  3. Recent Thoughts (アコーディオン展開式)

**Streak Display**
- コンパクトなインラインカード（巨大ヒーローカードではない）
- Background: `#ffffff` (白カード)
- **右上に設定アイコン**: 歯車 SVG の丸ボタン（32px, `rgba(255,255,255,0.16)` bg, white icon, `aria-label="プロフィールを編集"`）→ `/onboarding`（編集モード）へ遷移
- Content: flame SVG icon（20px、Green Accent）+ 数字（24px, weight 700）+ "日連続" テキスト（16px）
- 1行に収まるインラインレイアウト: `[icon] [数字] 日連続`
- Padding: `--space-3` (16px)
- Radius: `12px`
- Shadow: card shadow

**Calendar View**
- Title: "○年○月" (16px, weight 600)
- Grid: 7 columns (日月火水木金土)
- Weekday headers: 12px, weight 600, `rgba(0,0,0,0.58)`
- Date cells: `36x36px`
  - Recorded: `#00754A` (Green Accent) background, white text, `border-radius: 50%`
  - Today (unrecorded): `1px solid #00754A` outline, no fill
  - Empty: transparent background, `rgba(0,0,0,0.58)` text
- Card container: white bg, 12px radius, card shadow
- Padding: `--space-3` (16px)
- 前月/次月ナビ: chevron SVG icons
- **今日以前の日はタップ可能**（未来日はタップ不可）：タップでその日の中央モーダルを表示
  - 記録ありの過去日：日付見出し＋タイトル＋6項目のラベル付き表示（複数件は縦に並べる）。**追記ボタンは出さない**（過去日は1日1件まで）。各記録の展開表示の末尾右に削除ボタン（ゴミ箱 SVG 16px, tertiary, `aria-label="この記録を削除"`。「最近の記録」と同じ確認ダイアログ→完全削除→カレンダー・ストリーク再計算。モーダル内の表示も更新）
  - 記録なしの過去日：空状態の文言（"この日の記録はまだありません"、14px, secondary, 中央）＋「この日の日記を書く」ボタン（Primary Filled・コンパクト幅）→ `/record?date=YYYY-MM-DD`（過去日付モード）へ遷移
  - 今日：記録の有無に関わらず「今日の日記を書く」ボタンを出し、遷移先は `?date=` なしの通常の記録タブ
  - ✕/背景タップで閉じる

**初期状態（記録0件・Empty State）**
- Hero のストリーク行: 数字の代わりに "今日から記録を始めよう"（flame アイコンは共通）
- Hero の挨拶: nickname があれば "こんにちは、{nickname}さん"
- カレンダー: 記録ありの日なし。今日のみアウトライン表示
- 最近の記録カード: 中央揃えの空状態を表示
  - テキスト: "まだ記録がありません。今日のことを話してみよう"（14px, secondary, 中央）
  - 記録ボタン（積み上がるブロック SVG＝記録タブと同じアイコン・Primary Filled・コンパクト幅、`aria-label="記録する"`）→ 記録タブへ遷移

**Recent Thoughts (アコーディオン式)**
- Title: "最近の記録" (16px, weight 600)
- List of 3-5 thoughts
- **閉じた状態（デフォルト）:**
  - 日付（13px, `rgba(0,0,0,0.58)`）+ **タイトル**（成形時に AI 生成・15文字以内・体言止め。16px, weight 500, 1行）
  - 右端に chevron-down SVG icon
  - タップ領域: フル幅（44px minimum height）
  - Divider between items: `1px solid #edebe9`
- **開いた状態（タップで展開）:**
  - chevron が上向きに回転（`rotate(180deg)`, transition 0.2s）
  - **6項目（出来事/思考/行動/理由/感情/価値観）をラベル付きで縦に表示**（サマリーは廃止。深掘り回答をマージした最終値をそのまま見せる）
    - Label: 13px, weight 600, Green Accent (`#00754A`)
    - Value: 15px, weight 400, `rgba(0,0,0,0.87)`, line-height 1.5
    - Field spacing: `--space-2` (8px) between label and value, `--space-3` (16px) between fields
    - 記録フロー Phase 2 と同じレイアウト（読み取り専用）で、画面間の見え方を統一する
  - **削除ボタン**: 展開表示の末尾右にゴミ箱 SVG（16px, tertiary, `aria-label="この記録を削除"`）。タップで確認ダイアログ（"この記録を削除しますか？ 削除すると元に戻せません" ＋ 削除〔赤〕/キャンセル）→ 削除で thought を完全削除し、カレンダー・ストリークを再計算
  - テキストは省略せず全文表示
  - Padding: `--space-3` (16px) for expanded content
- Card container: white bg, 12px radius, card shadow
- Padding: `--space-3` (16px)
- **テキスト省略禁止**: `line-clamp` や `truncate` は使わない。展開時は全文を表示する

---

### Recording Page (`/record`)

**Layout:**
- ページタイトルなし（タブバーのアクティブ状態で現在地が分かるため）
- ステッププログレスインジケーター: 3つのバーのみ（**フェーズ名のテキストラベルは表示しない**）
  - Phase 1: 日記 / Phase 2: 深掘り / Phase 3: 成形（確認・編集）
  - Bar — Active: Green Accent fill / Inactive: `#edebe9` fill, Height: `4px`
- **記録全体が1つのチャット画面**: 日記の送信・AIの質問・回答・成形カードがすべてチャットの流れとして積み上がる。3-phase flow: 日記 -> 深掘り -> 成形（確認・編集） -> Save
- **「日記帳」の雰囲気で相談（対話）と差別化する:**
  - **日付見出し**: ステップバーの下に今日の日付を大きく表示（例 "7月14日（火）"、22px, weight 600, Starbucks Green）。その下にフェーズの一言（"今日のこと" / "もう少しだけ"、13px, secondary）。日記帳のページをめくった感覚を作る（相談にはない要素）
  - **過去日付モード（`?date=` 付きで開いた場合）**: 日付見出しが対象日を表示し、フェーズの一言は "この日のこと" に変わる。見出しの横に「今日に戻る」テキストリンク（13px, secondary, 下線）を置き、タップで通常の今日モードに戻る。書くヒント・フロー・入力バーは今日モードと共通
  - **入力文字はセリフ体**: 記録画面のテキストエリア（日記本文・深掘りの回答）は Reading Serif（`"Iowan Old Style", Georgia, serif`）で表示し、「書き物」の質感を出す。相談はサンセリフのまま
  - **AI 吹き出しは控えめ**: 記録の AI 質問バブルは `#f2f0eb` フラット＋ceramic ボーダー（影なし）で「余白のメモ」程度の存在感に。相談の AI バブルは白カード＋影の「会話」スタイルのまま
  - ユーザー吹き出しの色分け（記録=Green Accent／相談=House Green）と合わせて、記録＝日記帳・相談＝対話の世界観を分ける

**Phase 1: 日記（Input）**
- **空状態（未入力・チャット0件）**: 画面中央に相談の Empty State と同トーンの案内を表示
  - 積み上がるブロック SVG（記録タブと同じアイコン。64px, Green Accent, stroke 細め）
  - タイトル: "今日のことを話してみよう"（18px, weight 600）
  - サブテキスト: "うまくいった日も、そうでない日も。記録が積み重なるほどパターンが見えてきます"（14px, secondary, 中央揃え）
  - 日記を送信したらこの案内は消え、チャットの流れに切り替わる
- 見出し: 日付（"7月14日（火）"）+ "今日のこと"（日記帳スタイル、前述）
- **入力はテキスト・音声の切替タブを持たない統合型**：1つのテキストエリアに、キーボード入力と音声入力（マイクボタン）の両方で書き込める
  - **入力バーは画面下部（タブバー直上）に固定**。書くヒントはその直上に表示
  - Textarea:
    - Placeholder: "今日のことを自由に..."
    - **初期高さは1行（48px）**。入力に応じて上方向に auto-grow
    - **1行のとき**: 左右パディング 48px で、文字はアイコン（左マイク・右アクション）の間に入る
    - **複数行になったら**: 本文は**全幅**（左右パディング 12px）で折り返し、下部にアイコン専用の段（bottom padding 52px）を確保する。アイコンの左右に無駄な空白列を作らない
    - Font: 16px, weight 400
  - **マイクボタン**: テキストエリアの**左下内側**に配置（全画面共通ルール：マイク＝左下、アクション＝右下）
    - 32px 丸形、`#00754A` background、white mic SVG icon
    - タップで録音開始 → 音声認識の文字起こしがテキストエリアに**追記**される（既存テキストは消さない）
    - 録音中: ボタンが赤（`#c82014`）に変化 + パルスアニメーション、`interimResults` でリアルタイムに文字表示
    - もう一度タップで録音停止。文字起こし結果はそのまま手で編集できる
- **書き方ヒント（サジェスト）:**
  - 下部固定の入力バーの**直上**に常時表示。分類の6項目を意識した問いかけチップで、何を書けばよいか迷わせない
  - チップ内容（6分類に対応）:
    - "何があった？"（出来事）
    - "どう考えた？"（思考）
    - "どう動いた？"（行動）
    - "なぜそうした？"（理由）
    - "今どんな気持ち？"（感情）
  - 見出し: "書くヒント"（13px, weight 600, `rgba(0,0,0,0.58)`）
  - Chip style: 12px, `#d4e9e2` bg, `#006241` text, radius 4px, padding `3px 8px`（分類タグと同スタイル）
  - あくまでガイド表示（タップ挿入などの機能は MVP では持たない）。全部に答える必要はなく、書けた分だけで AI 分類・深掘りが補う
- **音声入力の実装: Web Speech API**
  - **実装: `window.SpeechRecognition || window.webkitSpeechRecognition`**
  - 言語設定: `lang = 'ja-JP'`
  - `continuous = true`, `interimResults = true`（リアルタイム文字表示）
  - **対応環境**: Chrome / Edge / PC Safari / iOS Safari 14.5+。iOS の Chrome・アプリ内ブラウザ（LINE 等の WKWebView）は API 非搭載
  - ブラウザ非対応時: マイクボタンを非表示にし、テキスト入力のみ（エラーメッセージは出さない）
  - **自動再開ループ（実装必須）**: iOS Safari では連続認識が数秒〜十数秒で勝手に停止する。録音中フラグが立っている間は `onend` 発火時に即 `start()` を再実行し、ユーザーが停止するまで録音を継続する。再開をまたいでも確定済みテキストを失わないこと（文字起こしは「追記」設計なので途切れても全損しない）
  - 音声入力は独立コンポーネントに分離し、将来サーバー側 STT（Whisper 等）へ差し替え可能な構造にする
  - 音声のプライバシー（ブラウザの音声認識サービスへ送信される旨）は画面には表示せず、**プライバシーポリシーに記載**する
- **送信ボタン（テキストエリアの右下内側）:**
  - Icon: sparkles SVG（AI に渡すことを示す。`aria-label="送信する"`）
  - 32px 丸形、`#00754A` background、white icon（マイク＝左下と対になる配置。独立した全幅ボタンは置かない）
  - 送信すると日記テキストがユーザーの吹き出しとしてチャットに積まれる
  - **超短文ガード**：10文字未満の日記は AI を呼ばず、「もう少しだけ聞かせて。一言でも、何があったかだけでも大丈夫だよ。」と AI バブルで促す（サーバー側 API も同条件で 400 を返す）
  - Loading state: 送信直後、チャットの流れの中（送ったバブルの直下）に AI の「考え中」バブル（3点バウンス・記録トーン）を表示する

**Phase 2: 深掘り（Deep Dive・チャット）**
- **Phase 1 で送信した日記がユーザーの吹き出し**（Green Accent・セリフ体）として画面に残り、AI の深掘り質問が**その返信**としてすぐ下に表示される（会話の文脈が一目で分かる）
- 質問は**1回だけ**。冒頭に「書いてくれてありがとう」のような短い受け止めを添える
- AI の質問:
  - 左寄せバブル: `#f2f0eb` background, radius `4px 12px 12px 12px`
  - バブルの左に AI アバター（32px 丸形・House Green 塗り・白のスパイラル SVG。モック 04/05 準拠）
  - Question text: 15px, weight 400, line-height 1.5
- ユーザーの回答: Phase 1 と同じ下部固定の入力バーから送信（音声可）。Placeholder: "答えを入力..."
- **スキップ**: 質問バブルの下に "スキップ" テキストリンク（13px, `rgba(0,0,0,0.58)`, underline）。タップで回答せず分類へ進む

**Phase 3: 成形（確認・編集・チャット内カード）**
- 回答（またはスキップ）の後、AI が「今日の記録を整理したよ。違うところは直してね」の一言とともに**成形カードをチャット内に表示**する
- **全フィールド編集可能**：AIの成形結果は確定ではなく、ユーザーが各フィールドをその場で修正・加筆できる（AIの解釈違いの修正、書き漏らした情報の追記を想定）
- 成形は日記テキスト＋深掘り回答を統合した最終値（スキップ時は日記テキストのみから成形）
- **1カラム全文表示（2カラムグリッドではない、テキスト省略なし）**
- Card with bg: `#ffffff`, カードはチャットの流れの中に全幅で置く
- 6 fields displayed in vertical list:
  ```
  出来事：[full text, no truncation]
  思考：[full text]
  行動：[full text]
  理由：[full text]
  感情：[full text]
  価値観（AIの気づき）：[full text]
  ```
  - Label: 13px, weight 600, Green Accent (`#00754A`)
  - **価値観のラベルは "価値観（AIの気づき）" と表記**：唯一の AI 推測フィールドであることを明示し、断定的な印象を避ける（値の末尾に "（推測）" は付けない。ホームの展開表示でも同じ表記）
  - Value: 編集可能な textarea（auto-grow・1行から拡張）
    - Font: 15px, weight 400, `rgba(0,0,0,0.87)`
    - Background: `#ffffff`, Border: `1px solid #d6dbde`, Radius: 4px, Padding: `8px 10px`
    - Focus: border `#00754A`
  - テキストは省略せず全文表示（`line-clamp` 禁止）
  - Row spacing: `--space-2` (8px) between label and value, `--space-3` (16px) between fields
- Card padding: `--space-3` (16px)
- Radius: 12px
- **保存ボタン（カードの直下）:**
  - Icon: 鉛筆 SVG（「記録する」を示す。テキストなし、`aria-label="保存する"`）
  - Type: Primary Filled, Full width
  - Loading state: アイコンを loader に差し替え + "保存中..."
- 保存時の処理: 編集後の6項目を最終値として連結テキストをベクトル化し保存（見返したときに項目単体で意味が分かる状態にする）

**Success State（保存後のライフサイクル）**
- 保存成功 → トースト「記録しました」を表示しつつ **`/home` へ自動遷移**（ストリーク加算とカレンダー点灯が報酬として見える）
- トースト通知（画面上部からスライドイン）:
  - Background: `#d4e9e2` (Green Light)
  - Text: check SVG icon + "記録しました"
  - Font: 14px, weight 500, `#006241`
  - Auto-dismiss: 2s + fade out
  - Shadow: card shadow
- **記録タブへ戻ったとき**: 保存が済んだやり取り（日記・質問・回答・カード）は**タイトルだけのチップに畳んで**チャット上部に表示する（✓アイコン＋タイトル＋シェブロン。白カード・タップで展開→読み取り専用の成形カード＋「保存済み」バッジ〔12px, `#d4e9e2` bg, `#006241` text〕）。チャット本体は空状態に戻り、前の文章に引きずられず**2件目の日記**を白紙の気分で書ける（同じフローで別の記録として保存）
- **1日の上限は実質無制限（安全上限：会員30件/ゲスト3件）**: 上限に達した日は入力バーを無効化（マイク・送信ボタンを tertiary 色に）し、バーの上に "今日の記録は上限（n件）に達しました"（13px, secondary）を表示
- **日付が変わったら**（Asia/Tokyo 0時）: チャットはリセットされ Phase 1 の空状態に戻る。過去分はホームの「最近の記録」で見る

**Error State**
- Alert card (top of form):
  - Background: `hsl(4 82% 43% / 5%)`
  - Border: `1px solid #c82014`
  - Text: Error message
  - Font: 14px, weight 400, `#c82014`
  - Dismissible button (right side)

**Spacing:**
- Phase sections: `--space-4` (24px) between
- Card internal padding: `--space-3` (16px)

---

### Search / Consultation Page (`/search`)

**Layout:**
- **ページ見出しテキストなし**（タブバーのアクティブ状態で現在地が分かるため）。最上部はアイコンボタンの行のみ：
  - **左上：相談履歴ボタン**（時計アイコンの丸型アウトラインボタン、`aria-label="相談履歴"`）: タップで**左からスライドインするドロワー**（幅78%、背景 dim）を表示。ドロワー上部に「＋ 新しい相談」ボタン、その下に "相談履歴" 見出し＋スレッド一覧（タイトル1行省略＋最終更新日、現在のスレッドは `#d4e9e2` でハイライト）。スレッドをタップで開いて閲覧・会話の再開ができる（コンテキストはそのスレッド内のみ）。背景タップで閉じる
  - **右上：新しい相談ボタン**（＋アイコンの丸型アウトラインボタン、`aria-label="新しい相談"`）: タップで即座に新しいスレッドを開始する（確認ダイアログは出さない。以前のスレッドは履歴に残る）
- **新規スレッドの空状態（Empty State）**：「新しい相談」直後・メッセージ0件のとき、画面中央に表示
  - ブランドのスパイラル（72px, Green Accent）
  - タイトル: "過去の自分に相談しよう"（18px, weight 600）
  - サブテキスト: "あなたの記録をもとに、過去のあなたが一緒に考えます"（14px, secondary, 中央揃え）
  - このとき入力バーの Placeholder は "なんでも聞いてみよう"
- **スレッド単位のチャットインターフェース**：1つの相談（スレッド）の中では会話を続けられる（追い質問可）
  - **タブを開いたときは常に新規相談（空状態）から始まる**。過去のスレッドは保存されており、履歴ドロワーから開いて閲覧・再開できる
  - 履歴は上方向にスクロール。新しいメッセージが届いたら最下部へ自動スクロール
  - 参考にした記録は**各 AI 回答の直下に小さな添付チップ**として表示（大きなカードで常時見せない）。タップで一覧展開 → 記録タップで中身を閲覧（詳細は Related Thoughts 参照）
  - **記録への誘導**: チャット内容は学習・蓄積されないため、AI は相談の結論に気づきが含まれる場合、回答の締めで「この気づきは今日の記録に残しておこう」と自然に促す（システムプロンプトで指示）

**Query Form（画面下部に常時固定）**
- **入力欄は画面下部（タブバーの直上）に固定**。チャット・参考記録は入力欄の上でスクロールする（LINE 等のチャット UI と同じ構造）
- Textarea:
  - Placeholder: "過去の自分に相談しよう"
  - **初期高さは1行（48px）**、入力に応じて auto-grow。左右パディング 48px でアイコンと文字が重ならない（Phase 1 と同じ入力バー仕様）
  - **マイクボタンは左下内側、送信ボタンは右下内側**に配置:
    - **マイクボタン**: mic SVG, Green Accent 丸形（Phase 1/3 と同じ音声入力。文字起こしは追記）
    - **送信ボタン**: send SVG, Green Accent 丸形
- 別立ての CTA ボタンは持たない（送信は textarea 内の send ボタン）
- **1日の相談上限（30メッセージ）到達時**: 入力バーを無効化（マイク・送信を tertiary 色に）し、バーの上に "今日の相談はここまで。また明日話そう"（13px, secondary）を表示
- Loading state: 送信後、AI バブル位置に loader（"分析中..."）

**Advice Display (チャットバブル形式)**
- **会話風出力（ダークカード + markdown ではない）:**
- AI のアドバイス:
  - 左寄せバブル: `#f2f0eb` background, radius `12px 12px 12px 4px`
  - 小さな AI アイコン（16px, Green Accent）をバブルの左上に
  - Text: 15px, weight 400, line-height 1.6
  - テキストは自然な会話調（markdown 記法なし）
  - **Claude system prompt で以下を指定:**
    - markdown 記法（`**`, `##`, `-`, `>`等）を使わない
    - 友人のように自然な口調で話す
    - 箇条書きではなく文章で伝える
    - 最終的に Yes/No の明確なアドバイスを含める
- ユーザーの質問:
  - 右寄せバブル: **`#1E3932`（House Green）** background, white text, radius `12px 12px 4px 12px`
  - **モードの色分けルール**: ユーザー吹き出しは記録＝`#00754A`（Green Accent）／相談＝`#1E3932`（House Green）。同じチャット骨格の2画面を色で区別する（入力バーのアクションアイコンの違い〔記録=sparkles／相談=send〕と合わせて二重の手がかりにする）

**Related Thoughts (参考記録・2段階開示)**
- **段階1: 添付チップ（デフォルト表示）**
  - AI 回答バブルの直下に、paperclip SVG + "参考にした記録 n件" のチップを表示
  - Style: 12px, `rgba(0,0,0,0.58)` text, white bg, `1px solid #edebe9` border, radius 999px, padding `4px 10px`
  - 回答本文の邪魔をしない控えめな表示
- **段階2: 一覧展開（チップをタップ）**
  - チップ直下に記録リストを展開
  - 各記録: 日付（13px, `rgba(0,0,0,0.58)`）+ 出来事要約（14px, 1行）、Divider: `1px solid #edebe9`
- **段階3: 記録の中身（リストの記録をタップ）**
  - **中央モーダル**で記録の詳細を表示（画面中央にカード、fade-in + scale、背景は `rgba(0,0,0,0.4)` の dim）
  - カード: white bg, radius 16px, 左右マージン 16px, 縦中央配置。内容が長い場合はカード内スクロール
  - 内容: 日付 + タイトル + 6項目のラベル付き表示（ホームの展開表示と同じレイアウト・読み取り専用）
  - 閉じる: 右上の ✕ ボタン / 背景タップ

**Loading State**
- ドットアニメーション（チャットの「入力中...」風）
- 3つのドットが順番にバウンス
- 左寄せバブル内に表示

**Error State**
- Alert card:
  - Background: `hsl(4 82% 43% / 5%)`
  - Border: `1px solid #c82014`
  - Text: Error message
  - Font: 14px, weight 400, `#c82014`

**Spacing:**
- Query form: margin-bottom `--space-4` (24px)
- Bubbles: `--space-2` (8px) between

---

## 8. Responsive Behavior

### モバイルネイティブアプローチ

アプリシェルが `max-width: 430px` に固定されているため、従来のレスポンシブブレイクポイントではなく、モバイル幅を前提とした単一レイアウトを採用。

**全画面共通:**
- 1カラムレイアウト
- アプリシェル内は常にモバイル幅（430px以下）

**PC表示:**
- アプリシェルが中央に配置、周囲はグレー背景
- shadow でデバイスフレーム感を演出

### Touch Targets

- ボトムタブバーアイコン: minimum 44px height
- ボタン: minimum 44px height
- アコーディオン項目: フルwidth タップ領域

---

## 9. Micro-interactions

### Button Active State
- `transform: scale(0.95)` on click
- Duration: `0.2s`
- Timing: `ease`

### Form Focus
- Input border -> Green Accent (`#00754A`)
- Box-shadow: `0 0 0 2px rgba(0, 117, 74, 0.1)` (soft glow)
- Duration: `0.2s ease`

### Alert Dismiss
- Fade out: `opacity 0.3s ease-out`
- Auto-dismiss: 2s for success, manual for error

### Accordion Expand/Collapse
- Chevron icon: `rotate(180deg)`, transition `0.2s ease`
- Content: `max-height` transition or `grid-template-rows: 0fr -> 1fr`
- Duration: `0.2s ease`

### Calendar Hover (desktop)
- Date cell: background brightness +5%
- Cursor: pointer
- Transition: `all 0.15s ease`

### Chat Bubble Appear
- New bubble: slide up + fade in
- Duration: `0.3s ease-out`
- Transform: `translateY(8px)` -> `translateY(0)`

### Recording Pulse (音声入力中)
- Mic button: `box-shadow` pulse animation
- `@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(200,32,20,0.4) } 100% { box-shadow: 0 0 0 12px rgba(200,32,20,0) } }`
- Duration: `1.5s infinite`

### Loading Dots (相談ページ)
- 3 dots bouncing sequentially
- `@keyframes bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-6px) } }`
- Stagger: 0s, 0.15s, 0.3s delay
- Duration: `1.4s infinite`

---

## 10. Dark Mode (Future)

現在は Light Mode のみ。Dark Mode 対応は MVP 後。

---

## 11. Design Tokens Summary

### Colors
```css
--color-primary: #006241 (Starbucks Green)
--color-accent: #00754A (Green Accent)
--color-dark: #1E3932 (House Green)
--color-light: #d4e9e2 (Green Light)
--color-neutral-warm: #f2f0eb
--color-neutral-cool: #f9f9f9
--color-white: #ffffff
--color-text-primary: rgba(0, 0, 0, 0.87)
--color-text-secondary: rgba(0, 0, 0, 0.58)
--color-error: #c82014
```

### Typography
```css
--font-family: Inter, Manrope, sans-serif
--letter-spacing: -0.01em
--line-height-compact: 1.2
--line-height-normal: 1.5
```

### Spacing
```css
--space-1: 0.4rem (4px)
--space-2: 0.8rem (8px)
--space-3: 1.6rem (16px)
--space-4: 2.4rem (24px)
--space-5: 3.2rem (32px)
--space-6: 4rem (40px)
--space-7: 4.8rem (48px)
--space-9: 6.4rem (64px)
```

### Shadows
```css
--shadow-card: 0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)
--shadow-elevated: 0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)
```

### Radius
```css
--radius-card: 12px
--radius-button: 12px
--radius-input: 4px
--radius-tab: 8px
--radius-bubble: 12px
```

---

## 12. Do's and Don'ts

### Do
- Use Starbucks Green for headings and primary brand moments
- Apply Green Accent (`#00754A`) for primary CTAs
- Use warm neutrals (`#f2f0eb` / `#edebe9`) as page canvas
- Apply `scale(0.95)` active state on all buttons
- Layer 2-3 low-alpha shadows for elevation
- Keep letter-spacing tight at `-0.01em`
- Use `12px` radius on buttons for mature, professional look
- Let whitespace breathe between cards
- Use rounded geometry (12px on cards)
- Use SVG line icons (stroke-based, 1.5-2px) for all UI icons
- Show full text in classification results and expanded records (no truncation)
- Use chat bubble UI for AI conversations (deep dive, advice)
- Output AI advice in natural conversational tone (no markdown formatting)
- Use 1-column layout for classification results
- Keep the UI text-light -- communicate with icons, color, and layout

### Don't
- Don't use pure white as page canvas -- warm cream is essential
- Don't use single heavy drop shadow -- layer soft shadows
- Don't use emoji as UI icons (no fire emoji for streak, no face emoji for emotions) -- use SVG
- Don't mix typefaces in the same surface
- Don't introduce gradients -- color-block throughout
- Don't forget `scale(0.95)` on button active states
- Don't use pure black for body text -- use `rgba(0,0,0,0.87)`
- Don't use `line-clamp` or text truncation on classification results or expanded records
- Don't output AI responses in markdown format -- use conversational natural language
- Don't use 2-column grid for classification results -- 1-column full-text only
- Don't use radio buttons for input mode selection -- use tab-style toggle
- Don't use giant hero cards for streak display -- keep it compact and inline
- Don't place text directly on feature bands without sufficient contrast

---

## 13. Implementation Checklist

- [ ] Colors defined as CSS variables (Tailwind config)
- [ ] Typography scale implemented (rem-based)
- [ ] Spacing tokens created (--space-1 through --space-9)
- [ ] Button components styled (primary filled, outlined, 12px radius)
- [ ] Card components styled (default, feature-band, light-bg)
- [ ] Input/form components styled (text, textarea, with validation)
- [ ] SVG icon system set up (line icons, stroke-based)
- [ ] App shell (430px max-width, centered on desktop)
- [ ] Top header (48px, backdrop-blur) -- ホーム/オンボーディングのみ表示
- [ ] Bottom tab bar (56px, 3 tabs with SVG icons)
- [ ] Start page (`/`) -- logo, Google sign-in CTA, 規約同意リンク
- [ ] Onboarding page (`/onboarding`) -- プロフィール4項目・チップ選択・スキップ可・編集モード
- [ ] Dashboard page (`/home`) -- compact streak, calendar, accordion thoughts
- [ ] Accordion expand/collapse with 6項目のラベル付き表示
- [ ] Recording page (`/record`) -- チャット型フロー（日記→深掘り→成形）、ステップバー＋フェーズ名ラベル、日記帳スタイル（日付見出し・セリフ体）
- [ ] Audio input with Web Speech API (recording, transcription, fallback)
- [ ] 成形カード（チャット内・6項目編集可・保存ボタン）
- [ ] Chat-style deep dive question UI
- [ ] Search page (`/search`) -- スレッド型チャット、履歴ドロワー、新規相談、参考記録チップ→モーダル、Empty State
- [ ] Conversational AI output (system prompt, no markdown)
- [ ] Touch targets verified (44px+ minimum)
- [ ] Micro-interactions implemented (button scale, accordion, chat bubbles, pulse, dots)
- [ ] Accessibility: color contrast verified (WCAG AA minimum)
- [ ] Accessibility: focus states visible
- [ ] Performance: animations GPU-accelerated (transform/opacity)
