// 本番の設定もれを起動時に知らせる（PLAN 52・53 の運用の守り）。
// 入口が自動ゲストなので、ENFORCE_APP_CHECK と Upstash が無いままだと Anthropic / OpenAI の費用がむき出しになる。
// ここでは止めずに警告だけ出す（止めると設定前の本番が全部落ちるため）。手順は docs/SECURITY-SETUP.md の「公開前チェック」。

import { appCheckMode } from "@/lib/api/appCheck";

export type Env = Record<string, string | undefined>;

/** 本番で足りない設定の一覧（空なら問題なし）。本番以外では常に空 */
export function productionConfigWarnings(env: Env): string[] {
  if (env.NODE_ENV !== "production") return [];
  const warnings: string[] = [];
  const mode = appCheckMode(env.ENFORCE_APP_CHECK);
  if (mode !== "enforce") {
    warnings.push(
      `ENFORCE_APP_CHECK が "${env.ENFORCE_APP_CHECK ?? ""}"（${mode}）です。本番では enforce にしてください（docs/SECURITY-SETUP.md A）`
    );
  }
  if (!env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY) {
    warnings.push("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY が未設定です（App Check のトークンが付きません）");
  }
  if (env.RATE_LIMIT_DISABLED === "true") {
    warnings.push("RATE_LIMIT_DISABLED=true です。本番では外してください");
  } else if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push(
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が未設定です。IP レート制限がプロセス内メモリになり、サーバーレスではほぼ効きません（docs/SECURITY-SETUP.md B）"
    );
  }
  return warnings;
}

let warned = false;

/** プロセスで1回だけ警告を出す（proxy.ts から呼ぶ）。出した警告を返す */
export function warnProductionConfigOnce(env: Env = process.env, log: (msg: string) => void = console.warn): string[] {
  if (warned) return [];
  warned = true;
  const warnings = productionConfigWarnings(env);
  for (const w of warnings) log(`[production-config] ${w}`);
  return warnings;
}

/** テスト用：1回だけの印を戻す */
export function resetProductionWarningForTests(): void {
  warned = false;
}
