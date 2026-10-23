// Next 16 の Proxy（旧 middleware。Node.js ランタイム固定）。/api/* にボット対策をかける（PLAN 52・53）。
// 順番：IP レート制限（安い）→ App Check（Admin SDK で検証）→ 各 API Route（ID トークン検証・AI の日次上限）

import { NextResponse, type NextRequest } from "next/server";
import { APP_CHECK_MESSAGE, checkAppCheck } from "@/lib/api/appCheck";
import { checkRateLimit, getRateLimitStore } from "@/lib/api/rateLimit";

export async function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") return NextResponse.next();

  const rl = await checkRateLimit(
    { method: request.method, pathname: request.nextUrl.pathname, headers: request.headers },
    getRateLimitStore()
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: rl.retryAfter, message: rl.message },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const ac = await checkAppCheck(request.headers);
  if (!ac.ok) {
    return NextResponse.json({ error: "app_check_failed", message: APP_CHECK_MESSAGE }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
