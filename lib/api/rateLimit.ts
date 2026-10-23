// IP 単位のレート制限（PLAN 53）。proxy.ts から /api/* に対して呼ぶ。
//
// - 分あたり：/api 全体の上限と、AI を呼ぶ API（記録・深掘り・相談・手紙）の上限
// - 日あたり：同じ IP から「新しく作られた匿名アカウント」が API を使い始める数の上限
//
// 保存先は差し替え可能（RateLimitStore）。UPSTASH_REDIS_REST_URL / _TOKEN があれば Upstash Redis（REST）、
// 無ければプロセス内のメモリ（開発用。サーバーレスでは台ごとにばらばらになる「ないよりまし」）。
// RATE_LIMIT_DISABLED=true で丸ごと止められる。
// 保存先が落ちたときは通す（fail open）。AI 側の日次・月額の上限が最後の砦として残るため。

/** 1つの上限（固定ウィンドウ） */
export type RateRule = { name: string; limit: number; windowSec: number };

export const RATE_RULES = {
  /** /api/* 全体：1 IP あたり 1 分 60 回 */
  apiPerMinute: { name: "api", limit: 60, windowSec: 60 },
  /** AI を呼ぶ API：1 IP あたり 1 分 10 回 */
  aiPerMinute: { name: "ai", limit: 10, windowSec: 60 },
  /** 新しい匿名アカウント：1 IP あたり 1 日 10 件（大学・会社の共有回線を考えて少し多め） */
  newGuestPerDay: { name: "guest", limit: 10, windowSec: 86_400 },
} as const satisfies Record<string, RateRule>;

/** 発行から何秒以内の匿名ログインを「新規」とみなすか */
export const NEW_GUEST_MAX_AGE_SEC = 86_400;

/** やさしい文言（429 の message に入れる） */
export const RATE_LIMIT_MESSAGES = {
  perMinute: "少し急ぎすぎたみたい。ひと息ついてから、もう一度どうぞ。",
  newGuest: "今日はこの場所からのはじめての利用が多いみたい。また明日、試してみてね。",
} as const;

// ---------------------------------------------------------------------------
// 純粋ロジック（Vitest 対象）
// ---------------------------------------------------------------------------

/** AI を呼ぶ API か（記録の保存・編集は成形やベクトル化で外部 API を使う） */
export function isAiRoute(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  const p = pathname.replace(/\/+$/, "");
  if (m === "POST" && (p === "/api/deepdive" || p === "/api/consult")) return true;
  if (m === "POST" && p === "/api/letters/current") return true;
  if (m === "POST" && p === "/api/thoughts") return true;
  if (m === "PUT" && /^\/api\/thoughts\/[^/]+$/.test(p)) return true;
  return false;
}

/** ヘッダーからクライアントの IP を取る（Vercel は x-forwarded-for の先頭が本人） */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/** 固定ウィンドウのキーと、そのウィンドウが終わるまでの秒数 */
export function windowFor(rule: RateRule, id: string, nowMs: number): { key: string; retryAfter: number } {
  const nowSec = Math.floor(nowMs / 1000);
  const index = Math.floor(nowSec / rule.windowSec);
  const retryAfter = rule.windowSec - (nowSec % rule.windowSec);
  return { key: `rl:${rule.name}:${id}:${index}`, retryAfter };
}

/** count 回目のリクエストが上限を超えたか */
export function isOverLimit(count: number, rule: RateRule): boolean {
  return count > rule.limit;
}

/**
 * Authorization: Bearer <idToken> の中身を「署名を検証せずに」読む。
 * 匿名ログインで、ログインから NEW_GUEST_MAX_AGE_SEC 以内なら uid を返す。それ以外は null。
 *
 * 検証しない理由：ここは数えるだけ。偽造トークンで数えをすり抜けても、その後の API Route の
 * verifyIdToken で 401 になるので AI は呼ばれない。本物のトークンの中身は書き換えられない。
 */
export function newGuestUid(authHeader: string | null, nowMs: number): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const parts = authHeader.slice(7).split(".");
  if (parts.length !== 3) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { sub?: unknown; auth_time?: unknown; firebase?: { sign_in_provider?: unknown } };
  if (p.firebase?.sign_in_provider !== "anonymous") return null;
  if (typeof p.sub !== "string" || p.sub.length === 0 || p.sub.length > 128) return null;
  if (typeof p.auth_time !== "number") return null;
  const age = Math.floor(nowMs / 1000) - p.auth_time;
  if (age < -300 || age > NEW_GUEST_MAX_AGE_SEC) return null; // 時計のずれは 5 分まで許す
  return p.sub;
}

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Buffer.from(b64, "base64").toString("utf8");
}

// ---------------------------------------------------------------------------
// 保存先
// ---------------------------------------------------------------------------

export interface RateLimitStore {
  /** key を 1 増やして新しい値を返す。初回は ttlSec 後に消える */
  incr(key: string, ttlSec: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
}

/** プロセス内のメモリ（開発・テスト用） */
export class MemoryRateLimitStore implements RateLimitStore {
  private map = new Map<string, { value: string; expiresAt: number }>();
  constructor(private now: () => number = Date.now) {}

  private live(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt <= this.now()) {
      this.map.delete(key);
      return null;
    }
    return e;
  }

  private prune() {
    if (this.map.size < 10_000) return;
    const t = this.now();
    for (const [k, e] of this.map) if (e.expiresAt <= t) this.map.delete(k);
  }

  async incr(key: string, ttlSec: number) {
    this.prune();
    const e = this.live(key);
    const next = (e ? Number(e.value) || 0 : 0) + 1;
    this.map.set(key, { value: String(next), expiresAt: e?.expiresAt ?? this.now() + ttlSec * 1000 });
    return next;
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSec: number) {
    this.prune();
    this.map.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
  }
}

/** Upstash Redis（REST API の /pipeline を fetch で呼ぶ。SDK は入れない） */
export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private url: string,
    private token: string,
    private fetchImpl: typeof fetch = fetch
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await this.fetchImpl(`${this.url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    return data.map((d) => {
      if (d.error) throw new Error(`upstash ${d.error}`);
      return d.result;
    });
  }

  async incr(key: string, ttlSec: number) {
    // キーはウィンドウごとに別なので、毎回 EXPIRE しても期限はずれない
    const [count] = await this.pipeline([
      ["INCR", key],
      ["EXPIRE", key, ttlSec],
    ]);
    return Number(count);
  }

  async get(key: string) {
    const [v] = await this.pipeline([["GET", key]]);
    return v == null ? null : String(v);
  }

  async set(key: string, value: string, ttlSec: number) {
    await this.pipeline([["SET", key, value, "EX", ttlSec]]);
  }
}

let cachedStore: RateLimitStore | null | undefined;

/** 環境変数から保存先を選ぶ。RATE_LIMIT_DISABLED=true なら null（制限しない） */
export function getRateLimitStore(env: Record<string, string | undefined> = process.env): RateLimitStore | null {
  if (cachedStore !== undefined && env === process.env) return cachedStore;
  let store: RateLimitStore | null;
  if (env.RATE_LIMIT_DISABLED === "true") store = null;
  else if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    store = new UpstashRateLimitStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  else store = new MemoryRateLimitStore();
  if (env === process.env) cachedStore = store;
  return store;
}

// ---------------------------------------------------------------------------
// 判定
// ---------------------------------------------------------------------------

export type RateLimitRequest = { method: string; pathname: string; headers: Headers };
export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number; rule: RateRule; message: string };

export async function checkRateLimit(
  req: RateLimitRequest,
  store: RateLimitStore | null,
  nowMs: number = Date.now()
): Promise<RateLimitResult> {
  if (!store) return { ok: true };
  const ip = clientIp(req.headers);
  try {
    const rules: RateRule[] = [RATE_RULES.apiPerMinute];
    if (isAiRoute(req.method, req.pathname)) rules.push(RATE_RULES.aiPerMinute);
    for (const rule of rules) {
      const { key, retryAfter } = windowFor(rule, ip, nowMs);
      const count = await store.incr(key, rule.windowSec);
      if (isOverLimit(count, rule)) {
        return { ok: false, retryAfter, rule, message: RATE_LIMIT_MESSAGES.perMinute };
      }
    }

    const uid = newGuestUid(req.headers.get("authorization"), nowMs);
    if (uid) {
      const rule = RATE_RULES.newGuestPerDay;
      const { key, retryAfter } = windowFor(rule, ip, nowMs);
      const seenKey = `${key}:seen:${uid}`;
      let order = Number(await store.get(seenKey));
      if (!order) {
        // その IP で今日 何番目に現れた新しい匿名アカウントかを覚えておく（同じウィンドウの間は数え直さない）
        order = await store.incr(key, rule.windowSec);
        await store.set(seenKey, String(order), retryAfter);
      }
      if (isOverLimit(order, rule)) {
        return { ok: false, retryAfter, rule, message: RATE_LIMIT_MESSAGES.newGuest };
      }
    }
    return { ok: true };
  } catch (e) {
    console.warn("[rateLimit] store error, allowing request", e);
    return { ok: true };
  }
}
