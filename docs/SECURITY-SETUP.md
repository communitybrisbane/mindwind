# ボット対策の設定手順（PLAN 52・53）

コードは入っています。**動かすには、下の設定を本人が行う**必要があります（外部サービスの登録・課金を伴うため、エージェントは行っていません）。
設定しなくてもアプリは今までどおり動きます（App Check は `off`、レート制限はメモリで数えるだけ）。

## しくみ（ざっくり）

`proxy.ts`（Next 16 の Proxy。旧 middleware）が `/api/*` の前に立ち、次の順で見ます。

1. **IP レート制限**（`lib/api/rateLimit.ts`）
   - `/api` 全体：1 IP あたり **1分60回**
   - AI を呼ぶ API（記録の保存・編集・深掘り・相談・手紙の生成）：1 IP あたり **1分10回**
   - 新しい匿名アカウント（ゲスト）：1 IP あたり **1日10件**（ログインから24時間以内の匿名トークンを、その IP で何番目に現れたかで数える）
   - 超えたら `429 { error: "rate_limited", retryAfter, message }`（message はやさしい日本語）＋ `Retry-After` ヘッダー
   - 数字は `RATE_RULES` で変えられます
2. **App Check**（`lib/api/appCheck.ts`）
   - ヘッダー `X-Firebase-AppCheck` のトークンを Firebase Admin で検証
   - `ENFORCE_APP_CHECK` が `enforce` のとき、失敗は `401 { error: "app_check_failed" }`
3. 各 API Route（ID トークンの検証・AI の日次上限）— 今までどおり

既存の AI の日次・月額の上限（Anthropic の spend limit）が最後の砦です。保存先（Upstash）が落ちたときは、レート制限は**通す**（止めない）ようにしています。

---

## A. App Check（reCAPTCHA Enterprise）

### 1. Google Cloud で reCAPTCHA Enterprise のキーを作る

1. [Google Cloud Console](https://console.cloud.google.com/) を開き、**Firebase と同じプロジェクト**を選ぶ
2. 「API とサービス」→「ライブラリ」で **reCAPTCHA Enterprise API** を有効にする
   - 課金アカウントの紐づけを求められることがあります。月 10,000 回の評価までは無料枠（2026 年時点の料金表を確認してから進めてください）
3. 「セキュリティ」→「reCAPTCHA」→「キーを作成」
   - プラットフォーム：**ウェブサイト**
   - ドメイン：本番のドメイン（例：`mindwind.vercel.app`）と、開発用に `localhost`
   - 「チェックボックスを使用する」は**オフ**（スコアベース）
4. できたキーの **ID** をコピーする → これが `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`

### 2. Firebase Console で App Check を登録する

1. [Firebase Console](https://console.firebase.google.com/) → プロジェクト →「構築」→ **App Check**
2. 「アプリ」タブ → ウェブアプリを選び、プロバイダに **reCAPTCHA Enterprise** を選ぶ → 上のキー ID を貼って保存
3. （開発用）同じ画面の「︙」→「**デバッグトークンを管理**」→ トークンを追加 → 値を `.env.local` の `NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN` に入れる
   - `NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN=true` にすると、ブラウザのコンソールに新しいトークンが出るので、それを登録してもよい
   - デバッグトークンは本番では使われません（`NODE_ENV=production` では読まない）

### 3. 環境変数を入れる

`.env.local`（開発）と Vercel の Environment Variables（本番）に：

```
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=<キー ID>
ENFORCE_APP_CHECK=monitor
```

### 4. 段階的に強制する

| 段階 | `ENFORCE_APP_CHECK` | やること |
|---|---|---|
| ① | `off` | 既定。何もしない |
| ② | `monitor` | 本番で数日ようすを見る。Vercel のログに `[appCheck] invalid or missing token` が多く出ていないか確認 |
| ③ | `enforce` | API で強制（失敗は 401） |
| ④ | — | Firebase Console → App Check →「API」タブで **Authentication** と **Cloud Firestore** の「適用」を押す（匿名アカウントの大量作成を Firebase 側でも止める） |

④ を押すと、App Check を付けていない古いクライアントは Firebase に入れなくなります。②の段階で「確認済みのリクエスト」の割合が十分高くなってから押してください。

> 補足：クライアントが API に `X-Firebase-AppCheck` を付けるのは `lib/db/useUser.ts` の `authedFetch` です（`lib/db/appCheck.ts` の `appCheckHeaders()` を使う。配線済み。鍵が無いときはヘッダーを付けない）。

---

## B. IP レート制限（Upstash Redis）

### 1. Upstash のアカウントとデータベースを作る

1. [Upstash](https://upstash.com/) にサインアップ（GitHub ログイン可）
2. 「Redis」→「Create Database」
   - リージョン：Vercel の関数と近いところ（例：`ap-northeast-1` 東京）
   - プラン：**Free**（1日 10,000 コマンドまで。1 リクエストあたり 1〜4 コマンド使います。足りなくなったら Pay as you go を検討）
3. できたデータベースの「REST API」欄から次の2つをコピー
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`（**秘密**。`NEXT_PUBLIC_` を付けない）

> Vercel の「Storage → Marketplace → Upstash」から作ると、環境変数が自動で入ります。どちらでも可。

### 2. 環境変数を入れる

Vercel の Environment Variables（本番）に上の2つを入れて再デプロイ。開発では入れなくてよい（メモリで数えます）。

### 3. 開発で邪魔なとき

`.env.local` に `RATE_LIMIT_DISABLED=true`。

---

## 確認のしかた（本人）

- レート制限：同じ画面で深掘りを1分に11回以上呼ぶと「少し急ぎすぎたみたい。…」の 429 が返る
- App Check：`ENFORCE_APP_CHECK=enforce` で、ヘッダー無しの `curl https://<本番>/api/mood` が `401 app_check_failed` になる
