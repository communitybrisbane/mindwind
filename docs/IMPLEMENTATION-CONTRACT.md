# 実装契約（Phase 12〜19・新 UI v5）

並列で実装するエージェントが衝突せずに進むための「名前・型・API・ファイルの持ち主」の正。
見た目と動きの正は `docs/prototype/ui-v5.html`、タスクの正は `docs/PLAN.md` Phase 12〜19、AI の正は `docs/AI-CONSTITUTION.md` と `docs/mentor-prompt.md`。
この契約と食い違う必要が出たら、勝手に直さず「decisions」に書いて返す（指揮官が契約を改める）。

共有の型はコードにもある（契約と同じ内容）：

- `lib/db/types.ts` — データモデル（Thought / Chunk / MoodEntry / DayEntry / Letter / Profile.hideStreak）
- `lib/logic/moods.ts` — 5段階の `MOODS`・`MoodId`・`isMoodId`・`moodMetaLine`
- `lib/api/contracts.ts` — 新 API のリクエスト・レスポンス・エラーコード

この3ファイルは指揮官だけが編集する。足りない型が要るときは decisions に書く（自分のファイル内にローカル型を置くのは可）。

---

## 1. ルート一覧と画面遷移

| パス | 画面 | タブバー | 認証 | 持ち主 |
|---|---|---|---|---|
| `/` | 起動画面（革の机にカードが落ちる → ロゴ → 「タップしてスタート」） | なし | 裏で自動ゲスト | 83 |
| `/mood` | 気分の回転盤（決定 → 3択） | なし | 必要 | 63（3択は 64） |
| `/mood/write` | 一言（長押しで封をして保存） | なし | 必要 | 64 |
| `/home` | ホーム（挨拶・今週◯日・今週の便箋・今日の1枚・手紙のカード・歯車） | あり | 必要 | 72 |
| `/record` | 記録タブ（`?date=YYYY-MM-DD` で過去日モード） | あり | 必要 | 66 |
| `/search` | 相談タブ（文通） | あり | 必要 | 69 |
| `/letter` | 今週の手紙（封筒 → 引っぱり出す → 三つ折り）。`?week=YYYY-MM-DD` で過去の手紙 | なし | 必要 | 78 |
| `/settings` | 設定（アカウント・呼び名・音／振動／動き・規約・ログアウト・削除） | なし | 必要 | 49 |
| `/onboarding` | **廃止**。`/settings` へ `redirect()`（旧リンク・ブックマーク救済） | — | — | 48 |
| `/terms` `/privacy` | 静的ページ（既存のまま。紙の便箋の見た目は 81 で整える） | なし | 不要 | 既存 |
| `/dev-login` | 開発専用（既存のまま） | なし | 不要 | 既存 |

ディレクトリ：タブありは既存の `app/(tabs)/`（`layout.tsx` が `Desk` → `AuthGuard` → `TabBar` を置く）。タブなしの認証ページは **`app/` 直下**で、各ページが自分で `Desk` と `AuthGuard` で包む（`app/(full)/` は作らない。作ると同じパスが二重になる）。`/mood` → `app/mood/page.tsx`、`/mood/write` → `app/mood/write/page.tsx`、`/letter` → `app/letter/page.tsx`、`/settings` → `app/settings/page.tsx`。`/` は AuthGuard の外なので、`Splash` の中で `useEnsureUser()` を呼ぶ。

### 遷移のルール

1. **起動** `/`：演出を毎回フルで流す（タップで飛ばせる）。裏で `useEnsureUser()`（48）がゲストを用意する。「タップしてスタート」後（ユーザーが確定してから）、`GET /api/mood` を見て
   - 今日の気分が **null** かつ、この端末で今日まだ回転盤を出していない（`localStorage["mindwind:moodPromptedOn"] !== today`）→ `/mood`
   - それ以外 → `/home`
2. **回転盤** `/mood`：開いたら `localStorage["mindwind:moodPromptedOn"] = today`。玉をタップで決定 → `PUT /api/mood` → 3択。
   - 一言（鉛筆・緑）→ `/mood/write`　／　しっかり（開いたノート・紙）→ `/record`　／　ここまで（眠る月・チョーク）→ `/home`
   - あとで（しおり・左下）→ `/home`（気分は保存しない）　／　選び直す（戻す）→ 回転盤に戻る（`PUT /api/mood` で上書き）
   - ホームの今週の便箋の「今日」の輪をタップ → `/mood?from=home`（選び直し。決定後は `/home` へ戻る。3択は出さない）
3. **一言** `/mood/write`：長押しで `POST /api/thoughts { rawText, kind: "quick" }` → 封蝋の演出 → `/home`（玉が今週の便箋へ飛ぶ演出はホーム側〔72〕が `sessionStorage["mindwind:flyMood"]` を見て行う。値は `String(mood)`＝`"0"`〜`"4"`。書くのは 3択の「ここまで」と一言の保存成功のとき。ホームは読んだら消す）。空・2文字未満ならトースト「一言だけ書いてから、長押ししてね」で保存しない。
4. **記録** `/record`：日記 → 「書き終えた」（10文字未満はトースト「もう少し書いてみてね（10文字以上）」）→ `POST /api/deepdive` → 緑インクの1問 → 答える or とばす → 長押しで `POST /api/thoughts` → 封蝋 → `/home` ＋ トースト「記録したよ。」
5. **手紙** `/letter`：ホームの手紙カードから。「とじる」→ `/home`、「相談する」→ `/search?draft=<文字列>`（相談の入力欄に下書きとして入れる。69 が `draft` を読む）。
6. **設定** `/settings`：ホーム右上の歯車から。「もどる」→ `/home`。ログアウト → `/`。アカウント削除 → `/`。
7. **風の記録**：ホームの今週の便箋の帯をタップ → **モーダル**（`components/hist/HistorySheet` `{ open, onClose }`。別ルートにしない。`z-index` でタブバーの上に重なる）。月の日付をタップ → その日の記録モーダル（`components/hist/DayModal` → 67 の `components/thought/ThoughtModal`）。過去日で記録0件 → 「この日の日記を書く」→ `/record?date=`。
   - `ThoughtModal` の props：`{ open?, thought?, thoughts?, date?, initialId?, mood?, onClose, onUpdated?, onSaved?, onDeleted? }`（`onSaved` は `onUpdated` の別名。`thoughts` を省いて `date` だけ渡すと自分で取りに行く）。自分で全画面の幕（z-index 46）を描き、編集（PUT）と削除（確認 Dialog・長押し・DELETE）も中で行う。
   - z-index の段：タブバー 5 ＜ 風の記録 35 ＜ 日のモーダル 45 ＜ 記録のモーダル 46 ＜ Dialog 48 ＜ トースト 60。背景の風（AmbienceLayer）は 30。
8. `authedFetch` が 401 を受けたら `/` へ（既存どおり）。

### 画面の共通ルール

- 基準フレーム 390×844・最小 375px。プロトタイプは絶対配置だが、実装は **flex と相対配置**で組み、`h-dvh` のシェル内で縦に収める（`app/layout.tsx` のシェルは変えない：`max-w-[430px] h-dvh overflow-hidden`）。
- 操作は画面下3分の1に置く。画面下に説明のフッター文は置かない。
- ボタンは丸いアイコン（`RoundButton`）。文字は `label` で小さく添えるだけ。最小 54px。
- 画面に出る本人の文章は AI が書き換えない。表示は常に `rawText` / `deepDiveAnswer` / `chunk.text` のまま。

---

## 2. CSS 変数・フォント・SVG フィルター（`app/globals.css`・持ち主 41）

Tailwind v4 の `@theme` に置く（`bg-felt` `text-pen` `font-hand` のようにユーティリティで使える）。**既存トークン（`--color-primary` など）は 80 が消すまで残す**。

### 色

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-felt` | `#34492f` | 革の机（上） |
| `--color-felt2` | `#232f21` | 革の机（下）・グラデの終点 |
| `--color-paper` | `#f1e9d6` | 紙 |
| `--color-cream` | `#f4ecd8` | 机の上の文字色 |
| `--color-graphite` | `#34322d` | 紙の上の文字（鉛筆） |
| `--color-pen` | `#0d5a3c` | 緑インク（メンターの字・キャレット） |
| `--color-gold` | `#f0dca0` | 強調（今週の数字・長押しの輪・選択中のタブ） |
| `--color-moss` | `#2f7a5c` | 緑のボタン |
| `--color-warn` | `#b8402c` | 赤いボタン（削除・ログインし直し） |
| `--color-dot` | `#c8412c` | 歯車の赤い点・手紙の未読の点 |
| `--color-slip` | `#f8f0c4` | 付箋（黄） |
| `--color-tabbar` | `#1d291d` | タブバーの地 |
| `--color-mood-0` … `--color-mood-4` | `MOODS[i].color` | 玉の色（年のビューの点にも） |
| `--color-mood-0-deep` … `--color-mood-4-deep` | `MOODS[i].deep` | 玉のふち |

### 紙・革の質感（`:root` に data URI。`@theme` ではなく通常の CSS 変数）

`--tex1`（紙の粒）・`--tex2`（ムラ）・`--fib`（繊維）・`--leather`（革のしぼ）。値はプロトタイプ `:root` の4つをそのまま写す。

### 書体（`next/font/google` → `app/fonts.ts`、41）

`app/fonts.ts` が次の CSS 変数を `<html>` に付ける：`--font-kiwi`（Kiwi Maru 400/500）・`--font-yomogi`（Yomogi 400）・`--font-klee`（Klee One 400/600）・`--font-kurenaido`（Zen Kurenaido 400）・`--font-zenmaru`（Zen Maru Gothic 500/700）。
`globals.css` の `@theme` で役割名に束ねる：

| 変数 | 中身 | 用途 |
|---|---|---|
| `--font-mincho` | Kiwi Maru | 見出し（名前は旧仕様からの流用。明朝は使わない） |
| `--font-hand` | Yomogi | あなたの言葉（日記・一言・相談の問い） |
| `--font-hand2` | Klee One | 補助（キャプション・日付） |
| `--font-pen` | Zen Kurenaido | メンターの字（緑インク） |
| `--font-ui` | Zen Maru Gothic | UI 全般・`html` の既定 |

### SVG フィルター（`components/ui/SvgDefs.tsx`、41。`app/layout.tsx` の `<body>` 直下に1回だけ置く）

| id | 用途 | 使い方 |
|---|---|---|
| `pencil` | 鉛筆の線のゆらぎ | `filter: url(#pencil)`（アイコン・罫・輪） |
| `wc` | 水彩のにじみ | 玉の塗り |
| `deckle` | 紙のふちのゆらぎ | `Paper` の `::before` |
| `ink` | インクの消印（プロトタイプの `inkf`） | 回転盤の決定の輪 |
| `logoink` | ロゴのにじみ | 起動画面 |

ユーティリティクラス（41 が globals.css に定義）：`.sheet`（紙＝`Paper` の実体）・`.pencil`・`.hand`・`.pen-ink`（緑インクの段落 `.pen`）・`.mnote`（余白のメンターの字）・`.rule-lines`（罫線 34px 行送り）・`.shake`（上限の揺れ）・`.rm`（動きを減らす：`<html>` に付く。`.rm *{animation:none!important;transition-duration:.01ms!important}`）。

---

## 3. 共有部品（`components/ui/`）

import は `@/components/ui/<Name>`。すべて `"use client"`。

```ts
// components/ui/Paper.tsx（42）紙。背景の質感＋ふち＋影。中は自由
<Paper as?: "div"|"section"|"article"  rotate?: number  /* deg */  className?  style?  onClick?  role?  aria-label? >{children}</Paper>

// components/ui/Slip.tsx（42）付箋（マスキングテープつき）
<Slip tone?: "yellow"|"cream"  tape?: "left"|"right"|"center"|"none"  tapeColor?: "green"|"pink"  rotate?: number  className?  onClick? >{children}</Slip>

// components/ui/Tape.tsx（42）マスキングテープ単体
<Tape color?: "green"|"pink"|"paper"  className?  style? />

// components/ui/RoundButton.tsx（42）丸いアイコンボタン。押すと沈む。最小 54px
<RoundButton
  variant?: "paper"|"green"|"chalk"|"ink"|"warn"   // 既定 "paper"。chalk＝机の上の点線、ink＝紙の上の点線、warn＝赤
  icon: IconName
  label?: string            // 下に小さく添える文字
  size?: number             // px。既定 54・最小 54
  aria-label: string        // 必須
  onClick?: () => void
  onHold?: () => void       // 長押し（進捗の輪が回り、holdMs で発火）。指定時は onClick は呼ばない
  holdMs?: number           // 既定 700（削除は 1300）
  disabled?: boolean
  className?  style?
/>

// components/ui/Toast.tsx（42）机の上の黒い札。ルートに <ToastHost /> を1つ置く（41 が layout に置く）
export function ToastHost(): JSX.Element
export function showToast(message: string): void          // いま出す（同一画面）
export function requestToast(message: string): void       // 遷移先で出す（sessionStorage "mindwind-toast"。既存 components/Toast.tsx と同じキー）

// components/ui/Dialog.tsx（42）紙のダイアログ（設定の確認・削除）
<Dialog open title text /* ReactNode */ buttons: Array<{ icon: IconName; label: string; variant?: RoundButton["variant"]; hold?: boolean; onPress: () => void }> onClose />

// components/ui/Icon.tsx（43）鉛筆アイコン（二重のラフスケッチ）。viewBox 0 0 32 32
export type IconName = "gear"|"shield"|"trash"|"exit"|"mic"|"pencil"|"book"|"moon"|"arrow"|"arrowL"|"plane"|"check"|"env"|"envopen"|"undo"|"bookmark"|"hanko"|"corner"|"swirl"|"stack"|"cloud"
<Icon name: IconName  size?: number|string /* 既定 "1em" */  className? />
export const ICON_PATHS: Record<IconName, string>   // プロトタイプ ICONS と同じパス

// components/ui/Bead.tsx（43）気分の玉（水彩＋鉛筆の風）
<Bead mood: MoodId  size?: number /* 既定 38 */  className?  style? />
<MoodGlyph mood: MoodId  size?: number />         // 風の線だけ（封蝋の中・リールの横）
<BeadSlot today?: boolean  size?: number />      // 空の点線の輪（書かなかった日。today で緑の輪＋呼吸）

// components/ui/LimitCounter.tsx（45）「n / max」。warnAt 以上で赤字
<LimitCounter length: number  max: number  warnAt?: number /* 既定 ceil(max*0.9) */  className? />

// components/mood/Postmark.tsx（64）封蝋（赤い蝋＋今日の玉の風）。保存の演出で使う（66 も使う。`components/ui/Seal.tsx` は作らない）
export function WaxSeal({ mood: MoodId|null, playing: boolean, onAnimationEnd?: () => void }): JSX.Element
//   ※ WaxSeal は top:300px を持つ。別の場所に置くときは親の CSS で位置を上書きする（record.module.css の .seal > div が例）

// components/TabBar.tsx（46）3タブ。(tabs)/layout.tsx だけが置く。純粋なデータと判定は components/ui/tabIcons.tsx（TABS・TABBAR_HIDDEN_PREFIXES・isTabBarHidden・activeTabHref）
export default function TabBar(): JSX.Element   // ホーム=stack／記録=book／相談=swirl。pathname で選択。80 で消す対象から外す

// components/fx/AmbienceLayer.tsx（84）背景の風（色2枚・粒子 canvas〔MoodFx.tsx〕・稲光・揺れ）。app/layout.tsx のシェル内、{children} の直後に1つ。画面の上に z-index 30 で重なり、触れない
<AmbienceLayer />
```

`Paper` は内側の文字色を `--color-graphite` にする。`RoundButton` の `variant="paper"` は机の上で使い、紙の上では `"ink"` を使う。

---

## 4. `lib/ui/` の API

```ts
// lib/ui/preferences.ts（44）端末ごとの設定。localStorage "mindwind:prefs"
export type Preferences = { sound: boolean; vibrate: boolean; reduceMotion: boolean }  // 既定 { sound:false, vibrate:true, reduceMotion:false }
export function getPreferences(): Preferences
export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void
export function subscribePreferences(listener: () => void): () => void
export function usePreferences(): Preferences               // useSyncExternalStore。SSR では既定値

// lib/ui/useReducedMotion.ts（44）
export function useReducedMotion(): boolean                  // prefers-reduced-motion || prefs.reduceMotion。true のとき <html class="rm">（44 が付け外しする）

// lib/ui/feedback.ts（44）振動（Android のみ・最初のタップ後）と音（既定オフ）
export type SoundName = "tick"|"pon"|"seal"|"chime"|"pop"|"rub"|"bell"|"wind"|"gust"
export function vibrate(pattern: number | number[]): void   // prefs.vibrate && Android && 触れた後だけ
export function sound(name: SoundName): void                // prefs.sound のときだけ。AudioContext は最初のタップで作る
export function unlockAudio(): void                         // 最初の pointerdown で呼ぶ（44 が window に1回仕掛ける）

// lib/ui/fxBus.ts（44 が箱を作り、63 が流し、84 が受ける）
export type FxEvent = { type: "preview"; mood: MoodId } | { type: "burst"; mood: MoodId } | { type: "spin" } | { type: "clear" }
export const fxBus: {
  preview(mood: MoodId): void   // 回転盤が止まった：うっすら
  burst(mood: MoodId): void     // 決めた：グワッ（嵐は約3秒で弱まる）
  spin(): void                  // 回している間：静まる
  clear(): void                 // 消す
  subscribe(listener: (e: FxEvent) => void): () => void
}

// lib/ui/useLimitedInput.ts（45）上限つきの入力。上限で揺れてトースト
export function useLimitedInput(opts: { max: number; label: string /* 「一言は」など */; initial?: string; onLimit?: () => void }): {
  value: string; setValue(v: string): void;
  onChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void;  // max を超える入力は切り、揺らしてトースト「{label}{max}文字までだよ」
  shaking: boolean;               // .shake を付けるフラグ（320ms）
  counter: { length: number; max: number; warnAt: number }   // <LimitCounter {...counter} /> にそのまま渡す
}

// lib/ui/useTodayMood.ts（62）今日の気分を全画面に配る1か所。GET /api/mood をモジュール内で1回だけ取り、PUT で更新
export function useTodayMood(): { mood: MoodId | null; date: string; loading: boolean; setMood(m: MoodId): Promise<void> }
export function primeTodayMood(res: TodayMoodResponse): void   // 起動画面が取った値を渡して二重取得を避ける

// lib/ui/useEnsureUser.ts（48）未ログインなら signInAnonymously。AuthGuard と起動画面が使う
export function useEnsureUser(): { user: AppUser | null; loading: boolean; error: string }

// lib/ui/useDisplayName.ts（48）表示用の呼び名（「◯◯さん」）。AI には渡さない
export function useDisplayName(): { name: string /* "風見さん" */; isAuto: boolean; reload(): void }

// lib/ui/useSettingsSeen.ts（51）歯車の赤い点（旧名 useNudge。純粋ロジック shouldShowGearDot も同じファイル）
export function shouldShowGearDot(isGuest: boolean, seenOn: string | null, todayKey: string): boolean   // 未 dismiss or 7日以上前
export function useSettingsSeen(): { showDot: boolean; markSeen(): void }   // ゲストだけ。markSeen で localStorage "mindwind:nudgeDismissedOn" = today
export function markSettingsSeen(): void                                     // 設定画面が開いたときに呼んでもよい

// lib/ui/useDraft.ts（68）下書き（端末内だけ）
export function useDraft(key: string /* draftKey() の戻り */): { draft: DraftData | null; save(d: DraftData): void /* デバウンス 500ms */; clear(): void }

// lib/ui/useMoodRange.ts（74）GET /api/moods のキャッシュつき取得
export function useMoodRange(from: string, to: string): { days: DayEntry[] | null; reload(): void }

// lib/db/useLetter.ts（78）GET/POST /api/letters/current の状態機械（locked/none/generating/ready・ストリーム受信）。lib/ui ではなく lib/db にある
// lib/ui/usePullOut.ts（78）封筒から手紙を引っぱり出すドラッグ
// lib/ui/wheelPhysics.ts（63）回転盤の物理（純粋関数。旧名 wheelMath）
// lib/ui/fxParticles.ts（84）粒子・fxPlan・residualOpacity（純粋関数。旧名 windFx）
```

純粋ロジック（`lib/logic/`、すべて Vitest つき）：

```ts
// lib/logic/autoName.ts（48）
export const AUTO_NAMES = ["風見","風車","風鈴","渡り鳥","旅人","凧","羽根","帆","風読み"] as const
export function autoNameFor(uid: string): string            // FNV-1a 32bit % 9 → 名前（「さん」は付けない）。同じ uid は常に同じ
export function displayNameFor(nickname: string | undefined, uid: string): string  // (nickname.trim() || autoNameFor(uid)) + "さん"

// lib/logic/streak.ts（47）既存 calcStreak は変えない
export function weekRecordDays(dates: Iterable<string>, todayKey: string): number        // 今週（月〜今日）の記録日数
export function daysSinceLastRecord(dates: Iterable<string>, todayKey: string): number | null  // 直近の記録からの空き日数（今日なら 0。記録なしは null）
export function isWelcomeBack(dates: Iterable<string>, todayKey: string): boolean       // 空き 3日以上 → 「おかえり」

// lib/logic/moodDay.ts（61）
export function isFirstLaunchOfDay(promptedOn: string | null, todayKey: string): boolean
export function recordedDays(thoughtDates: Iterable<string>, moodDates: Iterable<string>): Set<string>   // 記録あり＝thoughts ∪ moods（玉だけの日も1日に数える）
//   同じファイルに sanitizeMoodMap / weekStrip / monthMatrix（日付キーの行列）/ yearMatrix / validateRange（366日以内）もある。73 の parseRange は validateRange の薄い包みでよい

// lib/logic/chunk.ts（55）本人の言葉を書き換えずに分ける
export type ChunkInput = { rawText: string; deepDiveQuestion: string; deepDiveAnswer: string; kind: ThoughtKind }
export function splitIntoChunks(input: ChunkInput): Array<{ text: string; source: ChunkSource; order: number }>
//   目安 200〜400字・段落と文の境界で切る・文の途中で切らない・深掘りの Q&A は1チャンク（"Q: …\nA: …" の形）・短い本文は1チャンク・quick は1チャンク
//   テスト：chunks.filter(diary).map(text).join("") === rawText（空白の正規化なし＝一字も変えない）

// lib/logic/title.ts（56）
export function autoTitle(rawText: string): string   // 先頭の行を 。！？\n で区切り、trim、20文字まで（切るときは「…」を付けず 20 文字ちょうど）

// lib/logic/quickRecord.ts（56）一言の検証。64 はこれを使う（lib/logic/quickNote.ts は作らない）
export function validateQuickText(text: string): ...   // trim 後 2〜60（MIN_QUICK_LENGTH / MAX_QUICK_LENGTH）。サロゲートペアは1文字

// 歯車の赤い点の判定は lib/ui/useSettingsSeen.ts の shouldShowGearDot（§4）。lib/logic/nudge.ts は作らない

// lib/logic/draft.ts（68）
export type DraftData = { rawText: string; deepDiveQuestion: string; deepDiveAnswer: string; step: 1|2; savedAt: number }
export function draftKey(mode: "today"|"past", dateKey: string): string   // "mindwind:draft:today:2026-10-25" / "mindwind:draft:past:2026-10-20"

// lib/logic/reunion.ts（71）AI は使わない
export function pickReunion(thoughts: ThoughtSummary[], todayKey: string, lastShownId: string | null): { thought: ThoughtSummary; label: "1週間前のあなた"|"1か月前のあなた"|"最初に書いた日のあなた" } | null
//   記録 5 件未満は null。候補は 7日前／30日前（±1日は可）／最古の順に探す。lastShownId と同じ記録は避ける（他に無ければ null）

// lib/logic/moodRange.ts（73）
export function parseRange(from: unknown, to: unknown, todayKey: string): { ok: true; from: string; to: string } | { ok: false }   // 形式・from<=to・366日以内。to が未来なら today に丸める

// lib/logic/week.ts（76）月曜はじまり
export function weekKeyFor(dateKey: string): string                 // その週の月曜
export function weekRange(weekKey: string): { from: string; to: string }   // 月曜〜日曜
export function letterWeekFor(todayKey: string): string             // 日曜ならその週、月〜土なら前の週（＝日曜に開けて翌土曜まで読める）
export function weekDates(weekKey: string): string[]                // 7日分

// 月曜はじまりの月グリッドは lib/logic/moodDay.ts の monthMatrix / yearMatrix を使う（lib/logic/windCalendar.ts は作らない）。
// 月・年の表示の純粋な関数（initialView / viewRange / shiftView / canGoNext / viewTitle）は components/hist/MonthGrid.tsx にあり、MonthGrid.test.ts で検証する
```

---

## 5. データモデル（Firestore）

```
users/{uid}
  profile: { nickname(≤12), activity, stage, goal, hideStreak?: boolean }   ← activity/stage/goal は残す（AI の {{profile}} 用）。設定画面では呼び名だけ編集
  thoughts/{id}: { date, createdAt, rawText, deepDiveQuestion, deepDiveAnswer, title, kind: "full"|"quick", mood?: 0-4, tags: [] }
                 ＋ 旧: event/thinking/action/reason/emotion/values/embedding（移行完了まで残す。新規保存では書かない）
  chunks/{thoughtId}_{order}: { thoughtId, date, text, source: "diary"|"deepdive", order, embedding: vector, meta?: string, createdAt }
  moods/{YYYY-MM-DD}: { mood: 0-4, updatedAt }
  letters/{weekKey}: { weekKey, from, to, status, blocks, refs, moods[7], recordDays, model, createdAt, readAt }
  usage/{YYYY-MM-DD}: { deepdive, consult, record, letter }   ← shape は使わなくなる（80 で型から消す）
  chats/{chatId}/messages/{id}: 既存のまま（assistant の refs は `{ id, date, title, quote }[]`。元の記録が消えたら `{ id, date, deleted: true }` に伏せる）
  recordChat: **廃止**（56 から書かない。67 は読まない。下書きは端末内〔68〕。GET /api/record-chat は 80 で削除）
```

- chunk の id は `${thoughtId}_${order}` で決め打ち（編集時は同じ id に上書き・余った order は削除）。
- **embedding の入力**：`meta ? `${text}\n${meta}` : text`。quick は保存時に `meta = moodMetaLine(mood)`（AI を呼ばない）。full の meta は 57 が裏で足して embedding を作り直す。
- 相談・手紙で AI に渡すのは `chunk.text`＋`date`（meta は渡さない）。画面に出すのも `text`。
- 削除：記録の DELETE で `chunks` の同じ `thoughtId` を全部消す。手紙の `refs[].thoughtId` が一致するものは `deleted: true`・`quote: ""` にする（手紙は残す）。アカウント削除は `recursiveDelete` で全部消える。
- ベクトルインデックス：`chunks` コレクショングループ・`embedding`・1536次元・COSINE（58 が DEVELOPMENT.md にコマンドを書く）。

---

## 6. API 契約（型は `lib/api/contracts.ts`）

共通：`Authorization: Bearer <idToken>` 必須（なければ `401 {error:"unauthorized"}`）。エラーは常に `{ error: ApiErrorCode }`。入力は `limits.ts` の上限で検証。

| メソッド・パス | リクエスト | 成功 | エラー | 持ち主 |
|---|---|---|---|---|
| `GET /api/thoughts[?date=]` | — | `200 { thoughts: ThoughtSummary[] }`（新しい順・最大2000・`date` 指定でその日だけ） | 400 invalid_date | 56 |
| `POST /api/thoughts` | `CreateThoughtRequest` | `200 { id, title, date }` | 400 invalid_body / too_short（full<10・quick<2）/ too_long / invalid_date、409 daily_limit / date_taken、502 save_failed | 56 |
| `GET /api/thoughts/[id]` | — | `200 { thought }` | 404 not_found | 67 |
| `PUT /api/thoughts/[id]` | `UpdateThoughtRequest` | `200 { ok, title }`（チャンク作り直し・embedding 再生成・meta は 57 の仕組みで再生成） | 400、404 not_found、409 conflict（読んでから書くまでに別の画面が直した。開き直してやり直す）、502 update_failed | 67 |
| `DELETE /api/thoughts/[id]` | — | `200 { ok }`（先に相談の refs と手紙の引用の写しを伏せ、次に thought と chunks を消す） | 404 not_found、502 delete_failed（写しを伏せられず記録は消していない） | 67（引用は 79） |
| `GET /api/mood` | — | `200 { date, mood: 0-4 \| null }`（今日・Asia/Tokyo） | — | 62 |
| `PUT /api/mood` | `{ mood: 0-4 }` | `200 { date, mood }`（今日のみ・上書き） | 400 invalid_mood | 62 |
| `GET /api/moods?from&to` | クエリ | `200 { from, to, days: DayEntry[] }`（両端含む・日付順・無い日も `mood:null, records:0` で埋める） | 400 invalid_range | 73 |
| `GET /api/letters/current` | — | `200 CurrentLetterResponse` | — | 77 |
| `POST /api/letters/current` | — | `200` NDJSON `LetterStreamEvent`（start → delta… → done） | 409 too_few_records / already_generating / not_available、429 daily_limit、422 incomplete_response、502 ai_failed | 77 |
| `GET /api/letters` | — | `200 { letters: LetterSummary[] }` | — | 77 |
| `GET /api/letters/[weekKey]` | — | `200 { letter }` | 404 | 77 |
| `PUT /api/letters/[weekKey]` | `{ read: true }` | `200 { ok }` | 404 | 77 |
| `DELETE /api/letters/[weekKey]` | — | `200 { ok }` | 404 | 77 |
| `GET /api/profile` | — | `200 { profile \| null }` | — | 49 |
| `PUT /api/profile` | `Partial<Profile>` | `200 { profile }`（**merge**。nickname は trim→12文字） | 400 invalid_body | 49 |
| `POST /api/deepdive` | 既存 `{ diary }` | 既存 `{ question }` | 既存 | 変更なし（65 は quick の rawText を diary として送る） |
| `POST /api/consult` | 既存 | 既存 NDJSON（refs は `{ id, date, title, quote }` に変わる：quote は検索で当たったチャンクの `text`） | 既存 | 58 |
| `DELETE /api/account` | — | `200 { ok }` | — | 60（確認のみ） |
| `POST /api/shape` | — | **削除**（56） | — | 56 |
| `GET /api/record-chat` | — | **削除**（80） | — | 80 |

IP レート制限（53）と App Check（52）は `proxy.ts`（Next 16。Node ランタイム）で `/api/*` にかける。超過は `429 { error: "rate_limited", retryAfter }`、App Check 不可は `401 { error: "app_check_failed" }`。クライアントは `authedFetch`（`lib/db/useUser.ts`）が `X-Firebase-AppCheck` を付ける。

---

## 7. ファイルの持ち主（重複なし）

「編集してよいファイル」。ここに無いファイルは読むだけ。新しいファイルは自分の行に書いてあるディレクトリに作る。

| タスク | 編集してよいファイル |
|---|---|
| 40 | `docs/DESIGN-mindwind.md`・`docs/ARCHITECTURE.md`（文書のみ） |
| 41 | `app/globals.css`・`app/layout.tsx`・`app/fonts.ts`・`components/ui/SvgDefs.tsx`・`components/ui/Desk.tsx`（革の背景）・`components/ThemeColor.tsx`・`app/manifest.ts`（theme_color） |
| 42 | `components/ui/Paper.tsx`・`Slip.tsx`・`Tape.tsx`・`RoundButton.tsx`・`Toast.tsx`・`Dialog.tsx` |
| 43 | `components/ui/Icon.tsx`・`components/ui/iconPaths.ts`・`components/ui/Bead.tsx` |
| 44 | `lib/ui/feedback.ts`・`lib/ui/preferences.ts`・`lib/ui/useReducedMotion.ts`・`lib/ui/fxBus.ts`・`components/ui/FeedbackBoot.tsx`（unlockAudio・rm クラスの付け外し。41 が layout に置く）・それらの `*.test.ts` |
| 45 | `lib/logic/limits.ts`（§8 の定数を**全部**足す）・`lib/ui/useLimitedInput.ts`・`components/ui/LimitCounter.tsx`・`lib/logic/limits.test.ts` |
| 46 | `components/TabBar.tsx`・`components/ui/tabIcons.tsx`（+test）・`app/(tabs)/layout.tsx`（`app/(full)/layout.tsx` は作らない） |
| 47 | `lib/logic/streak.ts`・`lib/logic/streak.test.ts` |
| 48 | `components/AuthGuard.tsx`・`lib/ui/useEnsureUser.ts`・`lib/ui/useDisplayName.ts`・`lib/logic/autoName.ts`（+test）・`app/onboarding/page.tsx`（redirect）・`components/LoadingScreen.tsx` |
| 49 | `app/settings/page.tsx`・`components/settings/AccountCard.tsx`・`NameCard.tsx`・`ToggleRows.tsx`・`ConfirmDialog.tsx`・`settings.module.css`・`app/terms/page.tsx`・`app/privacy/page.tsx`（紙の見た目）・`app/api/profile/route.ts` |
| 50 | `components/settings/AccountCard.tsx` 内の `useAccount(user)` と `GoogleSheet`（公式 Google ボタン。§9）・`lib/auth/link.ts`（+test。純粋ロジック）・`lib/db/firebase.ts`（provider 設定が要るとき） |
| 51 | `lib/ui/useSettingsSeen.ts`（+test。`shouldShowGearDot` も同居）・`components/home/GearButton.tsx` |
| 52 | `proxy.ts`・`lib/db/appCheck.ts`（クライアント初期化）・`lib/api/appCheck.ts`（サーバー検証）・`lib/db/useUser.ts`（ヘッダー付与）・`docs/DEVELOPMENT.md`（環境変数） |
| 53 | `lib/api/rateLimit.ts`・`proxy.ts`（**52 の後に**追記）・`docs/DEVELOPMENT.md`（Upstash の環境変数） |
| 54 | `scripts/cleanup-guests.mjs`・`package.json`（scripts 追加）・`docs/DEVELOPMENT.md`（手順） |
| 55 | `lib/logic/chunk.ts`・`lib/logic/chunk.test.ts` |
| 56 | `app/api/thoughts/route.ts`・`lib/db/chunks.ts`（`writeChunks(tx, uid, thought)` / `deleteChunks(uid, thoughtId)` / `embedChunks`）・`lib/logic/title.ts`（+test）・`app/api/shape/`（削除）・`lib/logic/recordChatMessages.ts`（削除）・`app/api/record-chat/`（残す。80 が消す） |
| 57 | `lib/ai/meta.ts`・`lib/ai/mentorPrompt.ts`（META_APPENDIX 追加）・`docs/mentor-prompt.md`・`app/api/thoughts/route.ts`（**56 の後に** `after()` で meta 生成を呼ぶ1行）・`app/api/thoughts/[id]/route.ts`（**67 の後に**同じ1行） |
| 58 | `lib/ai/rag.ts`・`lib/logic/ragThought.ts`・`lib/logic/similarity.ts`・`app/api/consult/route.ts`・`lib/ai/mentorPrompt.ts`（CONSULT_APPENDIX。**57 の後**）・`docs/mentor-prompt.md`・`docs/DEVELOPMENT.md`（インデックス） |
| 59 | `scripts/backfill-chunks.mjs`・`package.json`（scripts） |
| 60 | `app/api/account/route.ts`・`scripts/cleanup-legacy-fields.mjs`・`docs/ARCHITECTURE.md`（移行後の手順の節） |
| 61 | `lib/logic/moodDay.ts`・`lib/logic/moodDay.test.ts` |
| 62 | `app/api/mood/route.ts`・`lib/ui/useTodayMood.ts` |
| 63 | `app/mood/page.tsx`・`components/mood/MoodWheel.tsx`・`MoodReel.tsx`・`Postmark.tsx`（消印 `Postmark` と封蝋 `WaxSeal`）・`mood.module.css`・`lib/ui/wheelPhysics.ts`（+test） |
| 64 | `app/mood/write/page.tsx`（一言の画面を内包）・`components/mood/MoodChoices.tsx`（`components/ui/Seal.tsx`・`lib/logic/quickNote.ts` は作らない。封蝋は `Postmark.tsx` の `WaxSeal`、検証は `lib/logic/quickRecord.ts`） |
| 65 | `components/record/AddDeepDive.tsx`（quick に深掘りを足す。`/api/deepdive` → `PUT /api/thoughts/[id]`） |
| 66 | `app/(tabs)/record/page.tsx`・`app/(tabs)/record/useRecordSession.ts`（音声認識 `useSpeech` も内包。`components/MicButton.tsx` は使わない）・`components/record/RecordSheet.tsx`・`MentorNote.tsx`・`SealHold.tsx`・`record.module.css` |
| 67 | `app/api/thoughts/[id]/route.ts`・`components/thought/ThoughtModal.tsx`（しおり・風の記録の両方から開く。編集・削除も中で行う）・`SavedSheet.tsx`・`thought.module.css` |
| 68 | `lib/logic/draft.ts`（+test）・`lib/ui/draftStore.ts`（localStorage の薄い層）・`lib/ui/useDraft.ts` |
| 69 | `app/(tabs)/search/page.tsx`（履歴の引き出しはこの中のローカル部品）・`app/(tabs)/search/useConsultChat.ts`（`RefPage`・`ChatSummary` のローカル型）・`components/consult/ConsultThread.tsx`・`AskSlip.tsx`・`ReplyLetter.tsx`・`RefSlips.tsx`・`RefModal.tsx`・`consult.module.css`（`NewThreadDialog` は無し。新しい相談はすぐ始める） |
| 70 | `components/consult/ConsultInput.tsx` |
| 71 | `lib/logic/reunion.ts`・`lib/logic/reunion.test.ts` |
| 72 | `app/(tabs)/home/page.tsx`（データ取得もここ。`useHomeData.ts` は無し）・`components/home/Greeting.tsx`（今週◯日の数字も内包）・`WeekBand.tsx`・`ReunionNote.tsx`・`LetterCard.tsx`・`home.module.css`（`app/(tabs)/home/useThoughtEditing.ts` は 80 が消す。page.tsx の型だけの `Thought` export も一緒に消す） |
| 73 | `app/api/moods/route.ts`・`lib/logic/moodRange.ts`（+test） |
| 74 | `components/hist/HistorySheet.tsx`・`MonthGrid.tsx`（+test）・`YearGrid.tsx`・`DayModal.tsx`・`hist.module.css`・`lib/ui/useMoodRange.ts`（`lib/logic/windCalendar.ts` は無し。`moodDay.ts` の `monthMatrix` を使う） |
| 75 | `docs/mentor-prompt.md`・`lib/ai/mentorPrompt.ts`（LETTER_APPENDIX。**58 の後**） |
| 76 | `lib/logic/week.ts`・`lib/logic/week.test.ts`・`lib/logic/letterKey.ts`（+test。`isWeekKey` / `letterDocId` / `isLetterDay` / `isLetterOpenable` / `hasEnoughForLetter`） |
| 77 | `app/api/letters/current/route.ts`・`app/api/letters/route.ts`・`app/api/letters/[weekKey]/route.ts`・`lib/ai/letter.ts`・`lib/ai/anthropic.ts`（`MODELS.letter`）・`lib/db/usage.ts`（`"letter"` 追加）・`lib/logic/letterRefs.ts`（引用の検証。+test） |
| 78 | `app/letter/page.tsx`・`components/letter/Envelope.tsx`・`Letter3D.tsx`・`Slip.tsx`・`LetterList.tsx`・`letter.module.css`・`lib/ui/usePullOut.ts`（+test）・`lib/db/useLetter.ts`（+test） |
| 79 | `lib/db/letterRefs.ts`（`maskLetterRefs(tx, uid, thoughtId)`）・`app/api/thoughts/[id]/route.ts`（**67 の後に** DELETE へ1行足す） |
| 80 | 削除：`components/icons.tsx`（`components/TabBar.tsx` は新 UI の本体なので**消さない**） `ShapedCard.tsx` `FairCopy.tsx` `ChatInputBar.tsx` `Calendar.tsx` `RecentThoughts.tsx` `DayRecordsModal.tsx` `EditThoughtModal.tsx` `ThoughtFields.tsx` `SavedRecordChips.tsx` `RecordHeader.tsx` `RecordToolTray.tsx` `MentorNote.tsx` `Header.tsx` `Toast.tsx` `CenterModal.tsx` `ChatHistoryDrawer.tsx` `ThinkingBubble.tsx` `RefThoughts.tsx` `AutoGrowTextarea.tsx`・`app/api/record-chat/`・`app/(tabs)/home/useThoughtEditing.ts`・`lib/logic/shapedRecord.ts` `partialShaped.ts` `recordChatMessages.ts`（+test）・`app/globals.css`（旧クラス）・`lib/db/usage.ts`（shape）。**残すもの**（80 の実施時に判明）：`components/icons.tsx` は `SpiralIcon` だけ残す（error / not-found / LoadingScreen が使う）。`lib/logic/recordText.ts`（+test）は `app/api/thoughts/`・`app/api/consult/`・`lib/db/chunks.ts` が使うので残す。`lib/db/types.ts` の `ShapedRecord` は `recordText.formatShapedFields` と `lib/logic/ragThought.ts`（相談の RAG が旧 6 項目を読む）が使うので、移行完了（60）で RAG が旧項目を読まなくなるまで残す |
| 81 | 全画面の軽微な修正（aria・最小サイズ・375px）。**他の全タスクが終わってから直列で** |
| 82 | `scripts/retention.mjs`・`package.json`（scripts） |
| 83 | `app/page.tsx`・`components/splash/Splash.tsx`・`Splash.module.css`・`components/splash/logo.ts`（+test。`docs/brand/mindwind-opening.svg` のパスと配置のデータ。描画は Splash.tsx）・`app/icon.svg` 等は**変えない**（§8） |
| 84 | `components/fx/AmbienceLayer.tsx`・`MoodFx.tsx`・`fx.module.css`・`lib/ui/fxParticles.ts`（+test）・`app/layout.tsx`（**41 の後に** `<AmbienceLayer />` を1行足す） |

### 直列にする組（同じファイルに触る）

- `app/layout.tsx`：41 → 84
- `proxy.ts`：52 → 53
- `app/api/thoughts/route.ts`：56 → 57
- `app/api/thoughts/[id]/route.ts`：67 → 79 → 57
- `lib/ai/mentorPrompt.ts`・`docs/mentor-prompt.md`：57 → 58 → 75（いずれも**ユーザー承認のあと**）
- `docs/DEVELOPMENT.md`：52 → 53 → 54 → 58（追記だけなので衝突は小さいが順に）
- 80・81 は最後に直列

### 推奨の波（依存の少ない順）

1. **波1（土台・並列）**：41 42 43 44 45 46 47 48 51 55 61 68 71 73 76 82 59 54
2. **波2（並列）**：56（55 の後）・62・63・64・52・83・84（41 の後）
3. **波3（並列）**：49・50・53（52 の後）・66（64 68 56 の後）・67・65・69・70・72・74・78
4. **波4（AI・承認つき・直列）**：57 → 58 → 75 → 77 → 79
5. **波5（直列）**：60 → 80 → 81

波の中では「契約の型を import して書く」。相手のファイルがまだ無くて `tsc` が通らないときは、自分のファイルのエラーでないので無視してよい（契約どおりの名前で import していること）。

---

## 8. 決めたこと（既定値。ユーザーが後で変えられる）

`lib/logic/limits.ts` に 45 が足す定数（名前を変えない）：

```ts
export const MAX_QUICK_LENGTH = 60;            // 一言の上限
export const MIN_QUICK_LENGTH = 2;             // 一言の最短
export const MAX_NICKNAME_LENGTH = 12;         // 呼び名
export const MAX_AUTO_TITLE_LENGTH = 20;       // 記録のタイトル（本文の先頭から自動）
export const LIMIT_WARN_RATIO = 0.9;           // 上限の約9割から赤字
export const MIN_THOUGHTS_FOR_LETTER = 3;      // 今週の記録がこの日数以上で手紙を書く
export const MIN_THOUGHTS_FOR_REUNION = 5;     // 再会カードを出す最少の記録数
export const NUDGE_REPEAT_DAYS = 7;            // 歯車の赤い点を再表示するまでの日数
export const MEMBER_LIMITS.letterPerDay = 3;   // 手紙の生成（やり直し込み。ゲストは 1/10 → 1）
export function letterLimitFor(isGuest: boolean): number
```

そのほかの既定：

| 項目 | 既定 | 根拠・備考 |
|---|---|---|
| 一言 | 最短2・上限60文字（trim 後） | PLAN 40 の候補〔40/60/100〕の中央 |
| 呼び名 | 最大12文字。空なら自動の呼び名 | 自動の呼び名9つ：風見・風車・風鈴・渡り鳥・旅人・凧・羽根・帆・風読み（＋さん）。uid の FNV-1a ハッシュで決める。AI には渡さない |
| 年のビューの点 | 色だけ（`MOODS[i].color`。玉の絵は描かない。記録なしは薄いグレー） | 1日＝1つぶ・31×12 で軽く |
| 記録のタイトル | 本文の先頭から自動・20文字まで・AI は使わない | `autoTitle()`。編集で本文が変わればタイトルも作り直す |
| 歯車の赤い点 | ゲストだけ。設定を開くまで出す。消したら7日後にまた出す。Google 連携で消える | 端末ごと（localStorage） |
| 背景の風の色 | 決めたあと、その日いっぱい（Asia/Tokyo）うっすら残す（`WindAmbience` が `useTodayMood` を見る） | 粒子は出さない。色だけ |
| 手紙 | その週（月〜日）に記録が **3日以上**のとき書く。日曜に開けられ、翌土曜まで読める。開いたときに生成（通知なし） | `letterWeekFor()`。モデルは 75 でユーザーが決める（提案：`claude-opus-4-8`・週1通なのでコストは小さい） |
| 再会カード | 記録 **5件以上**で出す。1日1回（端末ごと `localStorage["mindwind:reunion:<date>"]` に id）。同じ記録を続けて出さない | 7日前／30日前／最初の日の順 |
| 起動画面 | 毎回フル（約4.7秒）。どこをタップしても飛ばせる。「動きを減らす」では静止画 | PLAN 83 |
| 回転盤 | その日の最初の起動で1回（端末ごと）。スキップ・選び直し可 | PLAN 64 |
| 深掘りの最短 | 日記10文字未満は AI を呼ばずトースト | 既存 `MIN_DIARY_LENGTH` |
| 「おかえり」 | 直近の記録から3日以上空いたとき。責めない文言（「おかえり、◯◯さん」） | 47 |
| 今週◯日 | `profile.hideStreak` で隠せる（設定「くらし」にトグル） | 72・49 |
| recordChat | 廃止（下書きは端末内。しおりは `GET /api/thoughts?date=today`） | PLAN 66 の「既存どおり」はこの意味に読み替える。ユーザーに報告する |
| アプリアイコン・起動画像 | 今回は作らない（既存の `app/icon.svg` 等のまま）。ロゴからの作り直しは後で | PLAN 83 の確認事項 |
| 記録削除と手紙 | 手紙は残し、引用だけ伏せる（`refs[i].deleted = true`・切れ端に「（消した記録）」） | PLAN 79 の確認事項。`lib/db/scrubDeleted.ts` が実装 |
| 記録削除と相談の履歴 | 「読み返したページ」の写しは `{ id, date, deleted: true }` に伏せる（切れ端に「（消した記録）」）。返事の本文（AI がその記録を引いて書いた文）は本人が受け取った会話なので残す。消したければスレッドごと削除 | 憲法第13条の審査で決定（2026-10-24） |
| アカウント削除・ログアウトと端末 | `mindwind:` で始まる localStorage（下書き・再会カードの印・回転盤の印・赤い点の印）と sessionStorage を消す。`mindwind:prefs`（音・振動・動きをへらす）は端末の好みなので残す | `lib/ui/localData.ts` |
| 参考記録のしきい値 | コサイン類似度 0.3 未満のチャンクは落とす。1記録あたり 800 字（チャンクの境界で切る）。0件なら空のブロックではなく「見つからなかった」の一行を渡す | `lib/logic/ragChunks.ts`。計測を見て調整 |
| 「相談する」からの下書き | `/search?draft=` で渡し、入力欄に入れるだけ（送らない） | 78・69 |

---

## 9. 設定の hook（49 と 50 の境界）

```ts
// components/settings/AccountCard.tsx から export（50。別ファイル useAccount.ts にはしなかった）
export function useAccount(user: AppUser): {
  linked: boolean; email: string | null;
  link(): Promise<void>                // linkWithPopup。credential-already-in-use のときは state.conflict に積む
  conflict: { email: string } | null   // 「このGoogleアカウントは使用中です」ダイアログ用
  reloginWithConflict(): Promise<void> // 確認後：signInWithCredential でログインし直し（ゲストの記録は消える）→ /home
  dismissConflict(): void
  logout(): Promise<void>              // signOut → /
  deleteAccount(): Promise<void>       // Google は reauthenticateWithPopup → DELETE /api/account → deleteUser → /
  busy: boolean; error: string
}
```

49 の `AccountCard` はこの hook を呼び、ダイアログ（`Dialog`）の文言はプロトタイプ `renderSettings` / `$('#rowOut')` / `$('#rowDel')` のとおり。実装の補足：ログインし直しは「Google でログイン → 保存しておいたゲストのトークンで `DELETE /api/account`」の順（匿名ユーザーの `deleteUser` は新しいユーザーもサインアウトさせるため）。連携後は `getIdToken(true)` のあと `window.location.reload()`（`onAuthStateChanged` が発火しないため）。Google の削除で popup がブロックされたときは「本人確認」ダイアログからタップで再認証する。

---

## 10. 守ること（全タスク共通）

- AI の振る舞い（プロンプト文）を変えない。`docs/mentor-prompt.md` と `docs/AI-CONSTITUTION.md` は 57・58・75 以外は編集しない。
- 本人の文章を AI が書き換えない。`rawText` / `deepDiveAnswer` / `chunk.text` を表示にも AI 入力にもそのまま使う。
- 自動の呼び名・気分・手紙は RAG に入れない。会話も入れない。
- 日本語の文言はプロトタイプのとおり。
- 削除は完全削除（憲法第13条）。
- 1タスク＝自分の担当ファイルだけ。`git add` / `commit` / `push` はしない。開発サーバーを触らない。ブラウザ確認はしない。
- 迷ったら「decisions」に書いて返す。
