# Brain Bot - UI/UX Design Specification

Starbucks Design System を参考にした、新卒社会人向け AI メンターアプリの UI/UX 仕様書です。

---

## 1. Visual Theme & Atmosphere

Brain Bot は Starbucks のカフェの雰囲気を継承しながら、「**自分の思考を整理し、成長パターンを認識する**」というコンセプトを表現します。

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
- Use: "分類する", "保存", "相談する", "記録する"

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

**4. Dark Text Button (top-nav sign-in)**
- Background: transparent
- Text: `rgba(0,0,0,0.87)`, 14px, weight 600
- Border: `1px solid rgba(0,0,0,0.87)`
- Use: "ログイン", "登録"

### Cards

**Content Card (default)**
- Background: `#ffffff`
- Radius: `12px`
- Shadow: `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)`
- Padding: `16-24px` (`--space-3` to `--space-4`)
- Use: 分類結果, 深掘り質問, 検索結果, ダッシュボード要素

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
- Size: `20px`（ナビ）、`16px`（インライン）、`24px`（フィーチャー）
- 絵文字(emoji)をUIアイコンとして使わない。全てSVGで統一

**必要なアイコン一覧:**
- ナビ: ホーム(house)、記録(pen-line)、相談(message-circle)
- ダッシュボード: 火(flame/streak)、カレンダー(calendar)、シェブロン(chevron-down/up)
- 記録: マイク(mic)、キーボード(type)、チェック(check)、ローディング(loader)
- 相談: 送信(send)、引用(quote)

### Navigation

**Top Header (fixed)**
- Height: `48px`
- Background: `rgba(255,255,255,0.8)` + `backdrop-filter: blur(10px)`
- Content: "Brain Bot" brand text（center or left）
- Font: 16px, weight 600, Starbucks Green
- スタート画面（`/`）では非表示

**Bottom Tab Bar (fixed)**
- Height: `56px`
- Background: `#ffffff`
- Border-top: `1px solid #edebe9`
- 3 tabs: ホーム / 記録 / 相談
- Each tab: SVG icon（20px）+ label（11px, weight 500）
- Active state: Starbucks Green icon + label
- Inactive state: `rgba(0,0,0,0.38)` icon + label
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

Brain Bot はモバイルファーストの Web アプリとして、PC でもスマホアプリのような体験を提供する。

**アプリシェル:**
- `max-width: 430px` で固定、PC ブラウザでは中央配置
- `body { display: flex; justify-content: center }` で中央寄せ
- アプリシェルに `shadow` を付与してフレーム感を演出
- `viewport-fit=cover` で iPhone ノッチ対応

**ナビゲーション:**
- 上部ヘッダー: 48px、`backdrop-blur`、ブランド名のみ
- 下部タブバー: 56px、SVG アイコン + ラベル（ホーム/記録/相談）
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
- 縦中央: ロゴアイコン（72px 丸、House Green 背景）+ "Brain Bot" + タグライン
- 下部: 「Google ではじめる」ボタン（Primary Filled, 角丸 12px）+ サブテキスト
  - タップで Google ログイン（Firebase Authentication）→ 成功後 `/home` へ遷移
  - ログイン失敗時はエラートーストを表示
- 余計なテキストは置かない

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

**Recent Thoughts (アコーディオン式)**
- Title: "最近の記録" (16px, weight 600)
- List of 3-5 thoughts
- **閉じた状態（デフォルト）:**
  - 日付（13px, `rgba(0,0,0,0.58)`）+ 出来事の要約（16px, weight 500, 1行）
  - 右端に chevron-down SVG icon
  - タップ領域: フル幅（44px minimum height）
  - Divider between items: `1px solid #edebe9`
- **開いた状態（タップで展開）:**
  - chevron が上向きに回転（`rotate(180deg)`, transition 0.2s）
  - 整形済みサマリーを表示（深掘り回答を踏まえた統合テキスト）
  - サマリー形式: AIが出来事・思考・感情・深掘り回答を自然な文章に統合したもの
  - テキストは省略せず全文表示
  - 分類ラベル（出来事/思考/行動/理由/感情/価値観の6種）をタグとして小さく表示（12px, `#d4e9e2` bg, `#006241` text, radius 4px）
  - Padding: `--space-3` (16px) for expanded content
- Card container: white bg, 12px radius, card shadow
- Padding: `--space-3` (16px)
- **テキスト省略禁止**: `line-clamp` や `truncate` は使わない。展開時は全文を表示する

---

### Recording Page (`/record`)

**Layout:**
- ページタイトルなし（タブバーのアクティブ状態で現在地が分かるため）
- ステッププログレスインジケーター: 3つのドット or バーで現在のフェーズを表示
  - Phase 1: 入力 / Phase 2: 分類確認 / Phase 3: 深掘り
  - Active: Green Accent fill / Inactive: `#edebe9` fill
  - Height: `4px` bar or `8px` dots
- 3-phase flow: Input -> Classification -> Deep Dive -> Save

**Phase 1: Input Form**
- 見出し: "今日のこと" (H2, 20px, weight 600)
- **入力モード切替（タブ式、ラジオボタンではない）:**
  - 2つのタブ: テキスト | 音声
  - Active tab: `#00754A` background, white text
  - Inactive tab: transparent background, `rgba(0,0,0,0.58)` text
  - Tab container: `#f2f0eb` background, radius 8px
  - Each tab: radius 6px, padding `8px 16px`
- **テキスト入力（テキストタブ選択時）:**
  - Textarea:
    - Placeholder: "今日あったこと、感じたことを自由に..."
    - Min height: 120px
    - Font: 16px, weight 400
- **音声入力（音声タブ選択時）: Web Speech API**
  - 中央にマイクアイコン（SVG, 48px, Green Accent）
  - 録音ボタン: 丸形（64px, `#00754A` background, white mic icon）
  - 録音中: ボタンが赤（`#c82014`）に変化 + パルスアニメーション
  - 録音中テキスト: "録音中..." (14px, `rgba(0,0,0,0.58)`)
  - 録音完了後: テキストエリアに文字起こし結果を表示（編集可能）
  - ブラウザ非対応時: "お使いのブラウザは音声入力に対応していません" メッセージ + テキストタブに自動切替
  - プライバシー注記: "音声はブラウザの音声認識サービスに送信されます"（Micro, 13px, `rgba(0,0,0,0.58)`）をマイク下に表示
  - **実装: `window.SpeechRecognition || window.webkitSpeechRecognition`**
  - 言語設定: `lang = 'ja-JP'`
  - `continuous = true`, `interimResults = true`（リアルタイム文字表示）
- CTA button:
  - Text: "分類する"
  - Type: Primary Filled
  - Full width
  - Loading state: loader SVG icon + "分析中..."

**Phase 2: Classification Result**
- **1カラム全文表示（2カラムグリッドではない、テキスト省略なし）**
- Card with bg: `#f2f0eb` (Neutral Warm)
- 6 fields displayed in vertical list:
  ```
  出来事：[full text, no truncation]
  思考：[full text]
  行動：[full text]
  理由：[full text]
  感情：[full text]
  価値観：[full text]
  ```
  - Label: 13px, weight 600, Green Accent (`#00754A`)
  - Value: 15px, weight 400, `rgba(0,0,0,0.87)`
  - テキストは省略せず全文表示（`line-clamp` 禁止）
  - Row spacing: `--space-2` (8px) between label and value, `--space-3` (16px) between fields
- Card padding: `--space-3` (16px)
- Radius: 12px

**Phase 3: Deep Dive Question (チャット風)**
- **チャットバブルUI（カード内フォームではない）:**
- AI の質問:
  - 左寄せバブル: `#f2f0eb` background, radius `12px 12px 12px 4px`
  - 小さな AI アイコン（16px, Green Accent）をバブルの左上に
  - Question text: 15px, weight 400, line-height 1.5
- ユーザーの回答入力:
  - Textarea: 下部に固定風配置
  - Placeholder: "答えを入力..."
  - 送信ボタン: send SVG icon, Green Accent, textarea の右端内に配置
- CTA button:
  - Text: "保存する"
  - Type: Primary Filled
  - Full width
  - Loading state: "保存中..."

**Success State**
- トースト通知（画面上部からスライドイン）:
  - Background: `#d4e9e2` (Green Light)
  - Text: check SVG icon + "記録しました"
  - Font: 14px, weight 500, `#006241`
  - Auto-dismiss: 2s + fade out
  - Shadow: card shadow

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
- 見出し: "相談" (20px, weight 600)
- チャット風インターフェース

**Query Form**
- Textarea:
  - Placeholder: "例：新しいプロジェクト始めるべき？"
  - Min height: 80px
  - 右下に send SVG icon ボタン
- CTA button:
  - Text: "相談する"
  - Type: Primary Filled
  - Full width
  - Loading state: loader icon + "分析中..."

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
  - 右寄せバブル: `#00754A` background, white text, radius `12px 12px 4px 12px`

**Related Thoughts (参考記録)**
- アドバイスバブルの下に表示
- Heading: "参考にした記録" (14px, weight 600, `rgba(0,0,0,0.58)`)
- 各記録: コンパクトなリスト形式
  - 日付（13px, `rgba(0,0,0,0.58)`）+ 出来事要約（14px, 1行）
  - Divider: `1px solid #edebe9`
  - タップで詳細展開（Dashboard と同じアコーディオン動作）

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
- [ ] Top header (48px, backdrop-blur)
- [ ] Bottom tab bar (56px, 3 tabs with SVG icons)
- [ ] Start page (`/`) -- logo, tagline, Google sign-in CTA
- [ ] Dashboard page (`/home`) -- compact streak, calendar, accordion thoughts
- [ ] Accordion expand/collapse with formatted summary display
- [ ] Recording page (`/record`) -- tab selector, step indicator, 3-phase flow
- [ ] Audio input with Web Speech API (recording, transcription, fallback)
- [ ] 1-column full-text classification display
- [ ] Chat-style deep dive question UI
- [ ] Search page (`/search`) -- chat bubble interface
- [ ] Conversational AI output (system prompt, no markdown)
- [ ] Touch targets verified (44px+ minimum)
- [ ] Micro-interactions implemented (button scale, accordion, chat bubbles, pulse, dots)
- [ ] Accessibility: color contrast verified (WCAG AA minimum)
- [ ] Accessibility: focus states visible
- [ ] Performance: animations GPU-accelerated (transform/opacity)
