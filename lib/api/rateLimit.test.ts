import { describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  clientIp,
  getRateLimitStore,
  isAiRoute,
  isOverLimit,
  MemoryRateLimitStore,
  newGuestUid,
  RATE_RULES,
  UpstashRateLimitStore,
  windowFor,
} from "./rateLimit";

function token(payload: object): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `Bearer ${enc({ alg: "RS256" })}.${enc(payload)}.sig`;
}

const T0 = Date.UTC(2026, 9, 24, 3, 0, 0); // 分・日の境界ちょうど
const nowSec = Math.floor(T0 / 1000);

function req(method: string, pathname: string, h: Record<string, string> = {}) {
  return { method, pathname, headers: new Headers({ "x-forwarded-for": "1.2.3.4", ...h }) };
}

describe("isAiRoute", () => {
  it("AI を呼ぶ API だけ true", () => {
    expect(isAiRoute("POST", "/api/deepdive")).toBe(true);
    expect(isAiRoute("POST", "/api/consult")).toBe(true);
    expect(isAiRoute("POST", "/api/letters/current")).toBe(true);
    expect(isAiRoute("POST", "/api/thoughts")).toBe(true);
    expect(isAiRoute("PUT", "/api/thoughts/abc")).toBe(true);
    expect(isAiRoute("post", "/api/thoughts/")).toBe(true);
  });
  it("読み取りや軽い API は false", () => {
    expect(isAiRoute("GET", "/api/thoughts")).toBe(false);
    expect(isAiRoute("GET", "/api/letters/current")).toBe(false);
    expect(isAiRoute("DELETE", "/api/thoughts/abc")).toBe(false);
    expect(isAiRoute("PUT", "/api/mood")).toBe(false);
    expect(isAiRoute("PUT", "/api/thoughts/a/b")).toBe(false);
  });
});

describe("clientIp", () => {
  it("x-forwarded-for の先頭", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 9.9.9.9 , 10.0.0.1" }))).toBe("9.9.9.9");
  });
  it("無ければ x-real-ip、それも無ければ unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("windowFor / isOverLimit", () => {
  it("同じウィンドウは同じキー・境界で変わる", () => {
    const rule = RATE_RULES.apiPerMinute;
    const a = windowFor(rule, "ip", T0);
    const b = windowFor(rule, "ip", T0 + 59_999);
    const c = windowFor(rule, "ip", T0 + 60_000);
    expect(a.key).toBe(b.key);
    expect(a.key).not.toBe(c.key);
    expect(a.retryAfter).toBe(60);
    expect(b.retryAfter).toBe(1);
  });
  it("上限ちょうどは通し、超えたら止める", () => {
    expect(isOverLimit(60, RATE_RULES.apiPerMinute)).toBe(false);
    expect(isOverLimit(61, RATE_RULES.apiPerMinute)).toBe(true);
  });
});

describe("newGuestUid", () => {
  it("ログインから24時間以内の匿名なら uid", () => {
    const t = token({ sub: "u1", auth_time: nowSec - 100, firebase: { sign_in_provider: "anonymous" } });
    expect(newGuestUid(t, T0)).toBe("u1");
  });
  it("古い匿名・Google・壊れたトークンは null", () => {
    expect(
      newGuestUid(token({ sub: "u1", auth_time: nowSec - 90_000, firebase: { sign_in_provider: "anonymous" } }), T0)
    ).toBeNull();
    expect(
      newGuestUid(token({ sub: "u1", auth_time: nowSec, firebase: { sign_in_provider: "google.com" } }), T0)
    ).toBeNull();
    expect(newGuestUid("Bearer abc", T0)).toBeNull();
    expect(newGuestUid("Bearer a.!!!.c", T0)).toBeNull();
    expect(newGuestUid(null, T0)).toBeNull();
  });
});

describe("MemoryRateLimitStore", () => {
  it("期限で消える", async () => {
    let now = 0;
    const s = new MemoryRateLimitStore(() => now);
    expect(await s.incr("k", 1)).toBe(1);
    expect(await s.incr("k", 1)).toBe(2);
    now = 1000;
    expect(await s.incr("k", 1)).toBe(1);
    await s.set("x", "v", 1);
    expect(await s.get("x")).toBe("v");
    now = 2000;
    expect(await s.get("x")).toBeNull();
  });
});

describe("checkRateLimit", () => {
  it("保存先が null なら常に通す", async () => {
    expect(await checkRateLimit(req("POST", "/api/consult"), null, T0)).toEqual({ ok: true });
  });

  it("全体は分60回まで", async () => {
    const s = new MemoryRateLimitStore(() => T0);
    for (let i = 0; i < 60; i++) expect((await checkRateLimit(req("GET", "/api/mood"), s, T0)).ok).toBe(true);
    const r = await checkRateLimit(req("GET", "/api/mood"), s, T0 + 30_000);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.rule.name).toBe("api");
      expect(r.retryAfter).toBe(30);
      expect(r.message).toMatch(/ひと息/);
    }
    // 別の IP は別に数える
    expect((await checkRateLimit(req("GET", "/api/mood", { "x-forwarded-for": "5.5.5.5" }), s, T0)).ok).toBe(true);
  });

  it("AI の API は分10回まで", async () => {
    const s = new MemoryRateLimitStore(() => T0);
    for (let i = 0; i < 10; i++) expect((await checkRateLimit(req("POST", "/api/deepdive"), s, T0)).ok).toBe(true);
    const r = await checkRateLimit(req("POST", "/api/consult"), s, T0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule.name).toBe("ai");
    // AI 以外はまだ通る
    expect((await checkRateLimit(req("GET", "/api/thoughts"), s, T0)).ok).toBe(true);
  });

  it("新しい匿名アカウントは IP あたり日10件まで。同じ uid は数え直さない", async () => {
    const s = new MemoryRateLimitStore(() => T0);
    const guest = (uid: string) =>
      req("GET", "/api/mood", {
        authorization: token({ sub: uid, auth_time: nowSec - 10, firebase: { sign_in_provider: "anonymous" } }),
      });
    let t = T0;
    const tick = () => (t += 61_000); // 分の上限に当たらないよう進める
    for (let i = 1; i <= 10; i++) expect((await checkRateLimit(guest(`u${i}`), s, tick())).ok).toBe(true);
    expect((await checkRateLimit(guest("u1"), s, tick())).ok).toBe(true);
    const r = await checkRateLimit(guest("u11"), s, tick());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.rule.name).toBe("guest");
      expect(r.message).toMatch(/明日/);
    }
    // 止められた uid は同じ日のうちは止まったまま
    expect((await checkRateLimit(guest("u11"), s, tick())).ok).toBe(false);
  });

  it("保存先が壊れても通す", async () => {
    const broken = {
      incr: vi.fn().mockRejectedValue(new Error("down")),
      get: vi.fn(),
      set: vi.fn(),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await checkRateLimit(req("GET", "/api/mood"), broken, T0)).toEqual({ ok: true });
    warn.mockRestore();
  });
});

describe("getRateLimitStore", () => {
  it("環境変数で選ぶ", () => {
    expect(getRateLimitStore({ RATE_LIMIT_DISABLED: "true" })).toBeNull();
    expect(getRateLimitStore({})).toBeInstanceOf(MemoryRateLimitStore);
    expect(
      getRateLimitStore({ UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" })
    ).toBeInstanceOf(UpstashRateLimitStore);
  });
});

describe("UpstashRateLimitStore", () => {
  it("pipeline で INCR と EXPIRE を送る", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 3 }, { result: 1 }]), { status: 200 })
    );
    const s = new UpstashRateLimitStore("https://redis.example/", "tok", fetchImpl as unknown as typeof fetch);
    expect(await s.incr("k", 60)).toBe(3);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://redis.example/pipeline");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual([
      ["INCR", "k"],
      ["EXPIRE", "k", 60],
    ]);
  });
  it("エラー応答は例外", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ error: "ERR" }]), { status: 200 }));
    const s = new UpstashRateLimitStore("https://r", "t", fetchImpl as unknown as typeof fetch);
    await expect(s.get("k")).rejects.toThrow();
  });
});
