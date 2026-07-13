# Brain Bot - UI/UX Design Specification

Starbucks Design System を参考にした、新卒社会人向け AI メンターアプリの UI/UX 仕様書です。

---

## 1. Visual Theme & Atmosphere

Brain Bot は Starbucks のカフェの雰囲気を継承しながら、「**自分の思考を整理し、成長パターンを認識する**」というコンセプトを表現します。

- **Warm, Introspective** - カフェで落ち着いて考え込む感じ
- **Confidence in Self** - 自分の判断基準に気付く瞬間
- **Continuity Visible** - 毎日の積み重ねが見える

色は Starbucks Green（`#006241`）を中心に、クリーム背景でカフェの温もり感を保ちます。

**Key Characteristics:**
- Starbucks Green (`#006241` / `#00754A`) を brand color として統一
- Warm-neutral canvas (`#f2f0eb` / `#edebe9`) で落ち着き感
- 50px full-pill buttons + `scale(0.95)` active state
- 12px card radius + whisper-soft shadows
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
| Display (H0) | 2.8rem / 45px | 600 | 1.2 | -0.01em | Dashboard "ダッシュボード" など大見出し |
| H1 | 24px | 600 | 36px | -0.01em | Starbucks-Green color, section headers |
| H2 | 24px | 400 | 36px | -0.01em | Regular-weight section title |
| Body Large | 19px | 400 | 33.25px | -0.01em | Hero intro, feature-band body |
| Body | 16px | 400 | 24px | -0.01em | Default body copy |
| Small | 14px | 400–600 | 21px | -0.01em | Button label, form labels, metadata |
| Micro | 13px | 400 | 19.5px | -0.01em | Caption, helper text |

**Principles:**
- Weight shifts carry hierarchy, not size shifts
- Text never pure black — `rgba(0,0,0,0.87)` for warmth
- Rem-based scale anchored at `1rem = 10px`
- Tight `-0.01em` tracking on all text

---

## 4. Spacing System

Rem-based semantic scale (1rem = 10px):

| Token | Rem | Pixels | Use |
|-------|-----|--------|-----|
| `--space-1` | 0.4rem | 4px | Tightest inline padding |
| `--space-2` | 0.8rem | 8px | Small gap, button vertical padding |
| `--space-3` | 1.6rem | 16px | Default — card padding, outer gutter xs |
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
- Text: `#ffffff`, 14–16px, weight 600
- Border: `1px solid #00754A`
- Radius: `50px` (full pill)
- Padding: `7px 16px`
- Active: `transform: scale(0.95)`
- Transition: `all 0.2s ease`
- Use: "分類する", "保存", "相談する", "記録する"

**2. Primary Outlined**
- Background: transparent
- Text: `#00754A`, 14–16px, weight 600
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
- Padding: `16–24px` (`--space-3` to `--space-4`)
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
- Focus: border → `#00754A` (Green Accent), `box-shadow: 0 0 0 2px rgba(0, 117, 74, 0.1)`
- Font: 16px, weight 400, `rgba(0,0,0,0.87)`
- Placeholder: `rgba(0,0,0,0.38)`

**Floating Label (optional)**
- Label floats above input when focused/filled
- Desktop: 19px → 14px
- Mobile: 16px → 13px
- Horizontal offset: 12px
- Active translate: -12px Y with -50% transform
- Font: weight 600, `rgba(0,0,0,0.87)`

**Form Valid State**
- Border: `1px solid #d4e9e2` (Green Light)
- Background tint: `rgba(212, 233, 226, 0.33)`

**Form Invalid State**
- Border: `1px solid #c82014` (Red)
- Background tint: `hsl(4 82% 43% / 5%)`

### Navigation

**Global Nav (fixed top bar)**
- Height: `64px` (xs), `72px` (mobile), `83px` (tablet), `99px` (desktop)
- Background: `#ffffff`
- Shadow: `0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)`
- Left: Brain Bot logo + brand name
- Center/Right: "ダッシュボード", "記録", "相談"
- Font: SoDoSans / Inter, 14–16px, weight 400–600
- Active link: Starbucks Green text color

**Mobile Hamburger Menu (below 768px)**
- Drawer slides from left
- Same nav items stacked vertically
- Background: `#ffffff`

### Elevation & Depth

| Level | Shadow | Use |
|-------|--------|-----|
| Card | `0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)` | Default cards |
| Global Nav | `0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)` | Top nav lift |
| Floating CTA | `0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)` | Floating buttons |

---

## 6. Screen Specifications

### Dashboard / Home Page (`/`)

**Layout:**
- Header: "ダッシュボード" (H0, 45px, Starbucks Green)
- 3-section layout:
  1. Streak Display (top)
  2. Calendar + Recent Thoughts (2-column grid on desktop, stacked on mobile)

**Streak Display**
- Hero card with gradient (subtle, solid color-block preferred)
- Background: `#1E3932` (House Green) or Green Accent
- Content: 🔥 icon (emoji), large number (48px, weight 700), "日連続で記録しています！" caption
- Padding: `--space-6` vertical, `--space-4` horizontal
- Radius: `12px`
- Shadow: card shadow + slight lift

**Calendar View**
- Title: "○年○月" (H2, 24px, weight 400)
- Grid: 7 columns (日月火水木金土)
- Weekday headers: 14px, weight 600, `rgba(0,0,0,0.58)`
- Date cells: 48×48px minimum
  - Recorded: `#00754A` (Green Accent) background, white text
  - Empty: `#f9f9f9` (Neutral Cool) background, `rgba(0,0,0,0.58)` text
- Card container: white bg, 12px radius, card shadow
- Padding: `--space-4`

**Recent Thoughts Card**
- Title: "最近の記録" (H2)
- List of 3–5 thoughts
- Each item:
  - Date: 13px, `rgba(0,0,0,0.58)`, 下部に罫線 `1px solid #e7e7e7`
  - Event: 16px, weight 600, `rgba(0,0,0,0.87)`
  - Thinking: 14px, `rgba(0,0,0,0.58)`, "💭" prefix
  - Emotion: 14px, `rgba(0,0,0,0.58)`, "😊" prefix
  - Divider between items: `1px solid #edebe9`
- Card container: white bg, 12px radius, card shadow
- Padding: `--space-4`

**Spacing:**
- Sections: `--space-7` (48px) between
- Desktop grid gap: `--space-6` (40px)
- Mobile: full-width stacked

---

### Recording Page (`/record`)

**Layout:**
- Page title: "思考を記録する" (Display, 45px, Starbucks Green)
- 3-phase flow: Input → Classification → Deep Dive → Save

**Phase 1: Input Form**
- Card with heading: "今日のこと、思いを記録しよう" (H2, 24px)
- Subtext: "1分以上、自由に話してください。音声またはテキストで。" (14px, `rgba(0,0,0,0.58)`)
- Input type selector (radio):
  - ◯ テキスト | ◯ 音声
  - Font: 14px, weight 400
- Textarea (if text selected):
  - Placeholder: "例：今日、プロジェクトをまとめられた。焦らず全員の意見を聞くことが大事だと思った。"
  - Min height: 120px
  - Font: 16px, weight 400
- Audio input (if audio selected):
  - Placeholder area: "マイクアイコン + 録音開始ボタン"
  - Fallback: "音声入力（機能開発中）" center-aligned, gray text
- CTA button:
  - Text: "分類・深掘り質問を生成"
  - Type: Primary Filled
  - Full width on mobile, normal width on desktop
  - Loading state: "読込中..." + spinner

**Phase 2: Classification Result**
- Card with bg: `#f2f0eb` (Neutral Warm) or light blue tint
- Heading: "AI による分類結果" (H3, 20px, Starbucks Green)
- 6 fields displayed in list:
  ```
  出来事：[text]
  思考：[text]
  行動：[text]
  理由：[text]
  感情：[text]
  価値観：[text]
  ```
  - Label: 14px, weight 600, Starbucks Green
  - Value: 14px, weight 400, `rgba(0,0,0,0.87)`
  - Row spacing: `--space-3` (16px)
- Card padding: `--space-4`
- Radius: 12px
- Shadow: card shadow

**Phase 3: Deep Dive Question**
- Card with bg: `#f2f0eb` or light green tint (visual distinction from classification)
- Heading: "AI からの質問" (H3, 20px, Starbucks Green)
- Question text: 18px, weight 400, line-height 1.5, `rgba(0,0,0,0.87)`
- Textarea for answer:
  - Placeholder: "あなたの思いを自由に書いてください"
  - Min height: 100px
- CTA button:
  - Text: "保存"
  - Type: Primary Filled
  - Full width
  - Loading state: "保存中..."

**Success State**
- Alert card (top of form):
  - Background: `#d4e9e2` (Green Light) or `rgba(212, 233, 226, 0.2)`
  - Border: `1px solid #00754A`
  - Text: "✓ 記録を保存しました！"
  - Font: 16px, weight 500, Starbucks Green
  - Auto-dismiss after 2s

**Error State**
- Alert card (top of form):
  - Background: `hsl(4 82% 43% / 5%)`
  - Border: `1px solid #c82014`
  - Text: Error message
  - Font: 16px, weight 400, `#c82014`
  - Dismissible button (right side)

**Spacing:**
- Page title: margin-bottom `--space-7` (48px)
- Card sections: `--space-6` (40px) between
- Card internal padding: `--space-4` (24px)

---

### Search / Consultation Page (`/search`)

**Layout:**
- Page title: "相談する" (Display, 45px, Starbucks Green)
- Query form (top)
- Results section (appears after query)

**Query Form**
- Card heading: "迷った時は相談しよう" (H2, 24px)
- Subtext: "過去のあなたの成功パターンから、今のあなたへのアドバイスを返します。" (14px, `rgba(0,0,0,0.58)`)
- Textarea:
  - Placeholder: "例：新しいプロジェクト始めるべき？"
  - Min height: 100px
- CTA button:
  - Text: "相談する"
  - Type: Primary Filled
  - Full width
  - Loading state: "検索・分析中..."
- Card padding: `--space-4`
- Card radius: 12px
- Shadow: card shadow

**Advice Display (after query)**
- Heading: "AI のアドバイス" (H2, 24px, Starbucks Green)
- Content card:
  - Background: `#1E3932` (House Green) or feature band style
  - Text color: `#ffffff` (white)
  - Padding: `--space-5` (32px)
  - Radius: 12px
  - Whitespace-preserved text display (multiline)
  - Font: 16px, weight 400, line-height 1.6
- Spacing below: `--space-6` (40px)

**Related Thoughts**
- Heading: "参考になった過去の記録" (H2, 24px)
- Grid: 1–2 columns (mobile 1-up, desktop 2-up)
- Each thought card:
  - Content:
    - Date: "2024年7月13日" (13px, `rgba(0,0,0,0.58)`)
    - Event: 16px, weight 600
    - Thinking: "💭 [text]" (14px, `rgba(0,0,0,0.58)`)
    - Emotion: "😊 [text]" (14px, `rgba(0,0,0,0.58)`)
  - Background: `#ffffff`
  - Border: `1px solid #edebe9`
  - Radius: 12px
  - Padding: `--space-4`
  - Card shadow
- Grid gap: `--space-4` (24px)

**Loading State**
- Spinner animation (rotate 360°, 1s infinite)
- Text: "検索・分析中..." (16px, `rgba(0,0,0,0.58)`)
- Centered in card

**Error State**
- Alert card (like recording page):
  - Background: `hsl(4 82% 43% / 5%)`
  - Border: `1px solid #c82014`
  - Text: Error message
  - Font: 16px, weight 400, `#c82014`

**Spacing:**
- Page title: margin-bottom `--space-7` (48px)
- Query form: margin-bottom `--space-7` (48px)
- Advice section: margin-bottom `--space-7` (48px)

---

## 7. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| xs | < 480px | Single column, full-width cards, nav height 64px |
| mobile | 480–767px | Single column, nav height 72px |
| tablet | 768–1023px | 2-column grid (dashboard), nav height 83px |
| desktop | 1024–1439px | 2-3 column grids, full layout, nav height 99px |
| xl | 1440px+ | Max-width container, extra margins |

### Collapsing Strategy

**Dashboard:**
- Desktop: 2-column (calendar + thoughts side-by-side)
- Tablet: 2-column (calendar + thoughts)
- Mobile: Single column (stacked vertically)

**Search Results:**
- Desktop: 2-column related thoughts grid
- Mobile: 1-column stacked

**Recording Form:**
- Always single column
- Buttons: full-width on mobile, auto-width on desktop

### Touch Targets

- Buttons: minimum 44px height (WCAG AAA)
- Card interactions: min 48px padding around clickable areas
- Tap offset: `-8px` for floating elements

---

## 8. Micro-interactions

### Button Active State
- `transform: scale(0.95)` on click
- Duration: `0.2s`
- Timing: `ease`

### Form Focus
- Input border → Green Accent (`#00754A`)
- Box-shadow: `0 0 0 2px rgba(0, 117, 74, 0.1)` (soft glow)
- Duration: `0.2s ease`

### Alert Dismiss
- Fade out: `opacity 0.3s ease-out`
- Auto-dismiss: 2s for success, manual for error

### Calendar Hover (desktop)
- Date cell: background brightness +5%
- Cursor: pointer
- Transition: `all 0.15s ease`

### Card Hover (desktop)
- Recorded thought cards: shadow → darker shadow
- Transition: `box-shadow 0.15s ease`

---

## 9. Dark Mode (Future)

現在は Light Mode のみ。Dark Mode 対応は MVP 後。

---

## 10. Design Tokens Summary

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
--shadow-nav: 0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)
--shadow-elevated: 0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)
```

### Radius
```css
--radius-card: 12px
--radius-button: 50px
--radius-input: 4px
```

---

## 11. Do's and Don'ts

### Do
- Use Starbucks Green for headings and primary brand moments
- Apply Green Accent (`#00754A`) for primary CTAs
- Use warm neutrals (`#f2f0eb` / `#edebe9`) as page canvas
- Apply `scale(0.95)` active state on all buttons
- Layer 2–3 low-alpha shadows for elevation
- Keep letter-spacing tight at `-0.01em`
- Use full-pill `50px` radius on buttons
- Let whitespace breathe between cards
- Use rounded geometry (12px on cards)

### Don't
- Don't use pure white as page canvas — warm cream is essential
- Don't use single heavy drop shadow — layer soft shadows
- Don't square button corners — always 50px pill radius
- Don't mix typefaces in the same surface
- Don't introduce gradients — color-block throughout
- Don't forget `scale(0.95)` on button active states
- Don't use pure black for body text — use `rgba(0,0,0,0.87)`
- Don't ignore responsive collapsing — test on mobile
- Don't place text directly on feature bands without sufficient contrast

---

## 12. Implementation Checklist

- [ ] Colors defined as CSS variables
- [ ] Typography scale implemented (rem-based)
- [ ] Spacing tokens created (--space-1 through --space-9)
- [ ] Button components styled (primary, outlined, dark, etc.)
- [ ] Card components styled (default, feature-band, light-bg)
- [ ] Input/form components styled (text, textarea, with validation)
- [ ] Navigation component styled (global nav, mobile hamburger)
- [ ] Dashboard page layout complete
- [ ] Recording page (3-phase flow) complete
- [ ] Search/consultation page complete
- [ ] Responsive breakpoints tested
- [ ] Touch targets verified (44px+ minimum)
- [ ] Micro-interactions implemented (button scale, focus states, etc.)
- [ ] Accessibility: color contrast verified (WCAG AA minimum)
- [ ] Accessibility: focus states visible
- [ ] Performance: animations GPU-accelerated (transform/opacity)
