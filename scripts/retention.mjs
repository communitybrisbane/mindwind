// 継続率の計測スクリプト（PLAN 82）。読み取り専用。再会カード（おかえり）の効果を確かめるための集計だけを出す。
//
// package.json の scripts に足す行:
//   "retention": "node scripts/retention.mjs"
//
// 実行（何も書き換えない。出力は人数と割合だけで、本文・タイトル・uid は出さない）:
//   npm run retention                          # 全ユーザー
//   npm run retention -- --since 2026-11-01    # この日以降に始めた人／始まった途切れだけ（機能の前後比較用）
//   npm run retention -- --json                # 集計を JSON で出す
//
// 読むもの: users/{uid}/thoughts の date だけ、users/{uid}/moods のドキュメント ID（YYYY-MM-DD）だけ。
//          select() で date 以外のフィールド（rawText など）はサーバーから取らない。
// 記録した日 ＝ thoughts.date ∪ moods（玉だけの日も1日に数える）。
//
// 定義（詳しくは docs/OPS-retention.md）:
//   開始日 D0 ＝ そのユーザーの最初の記録日。
//   N日後の継続率（N = 1, 7, 30）:
//     分母 ＝ D0 + N 日が今日以前の人（まだ N 日たっていない人は入れない）
//     「ちょうど」＝ D0 + N の日に記録がある人の割合
//     「N日以内」＝ D0+1 〜 D0+N のどこかに記録がある人の割合
//   途切れ ＝ 記録の空きが3日以上（アプリの「おかえり」の条件と同じ）。
//     記録日 d の次の記録が d+3 以降、または次が無いまま今日が d+3 以降 → 1回の途切れ。
//     戻った率 ＝ 戻った途切れ ÷（戻った途切れ ＋ まだ戻っていない途切れ）。
// 日付は Asia/Tokyo の YYYY-MM-DD キー。

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DAY_POINTS = [1, 7, 30];
export const LAPSE_DAYS = 3;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD を UTC 0時の「通し日数」にする（日数の引き算用）。不正なら null。 */
export function dayNumber(key) {
  if (typeof key !== "string" || !KEY_RE.test(key)) return null;
  const t = Date.parse(`${key}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round(t / DAY_MS) : null;
}

/** いまの Asia/Tokyo の日付キー。 */
export function todayKeyJst(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 1人ぶんの記録日（キー）から、昇順で重複なしの通し日数の配列を作る。 */
export function toDayNumbers(keys) {
  const set = new Set();
  for (const k of keys) {
    const n = dayNumber(k);
    if (n !== null) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * 全ユーザーから継続率と戻った率を集計する。
 * @param {Iterable<Iterable<string>>} users 各ユーザーの記録日キー（thoughts.date ∪ moods）
 * @param {string} todayKey 今日（Asia/Tokyo）
 * @param {{ since?: string | null }} opts since: この日以降に始めた人／始まった途切れだけ数える
 */
export function computeRetention(users, todayKey, opts = {}) {
  const today = dayNumber(todayKey);
  if (today === null) throw new Error("todayKey が不正です");
  const since = opts.since ? dayNumber(opts.since) : null;
  if (opts.since && since === null) throw new Error("--since は YYYY-MM-DD で指定してください");

  const points = DAY_POINTS.map((n) => ({ n, eligible: 0, exact: 0, within: 0 }));
  let usersWithRecords = 0;
  let returned = 0;
  let away = 0;
  let returnedIn7 = 0;
  let returnedIn30 = 0;
  let awayUsers = 0;
  let lapsedEver = 0;

  for (const keys of users) {
    const days = toDayNumbers(keys);
    if (days.length === 0) continue;
    usersWithRecords++;
    const set = new Set(days);
    const d0 = days[0];

    if (since === null || d0 >= since) {
      for (const p of points) {
        if (d0 + p.n > today) continue; // まだ N 日たっていない
        p.eligible++;
        if (set.has(d0 + p.n)) p.exact++;
        for (let k = 1; k <= p.n; k++) {
          if (set.has(d0 + k)) {
            p.within++;
            break;
          }
        }
      }
    }

    let lapsedHere = false;
    let awayHere = false;
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      if (since !== null && d < since) continue;
      const next = i + 1 < days.length ? days[i + 1] : null;
      if (next !== null) {
        const gap = next - d;
        if (gap >= LAPSE_DAYS) {
          returned++;
          lapsedHere = true;
          if (gap <= 7) returnedIn7++;
          if (gap <= 30) returnedIn30++;
        }
      } else if (today - d >= LAPSE_DAYS) {
        away++; // 最後の記録から3日以上たっていて、まだ戻っていない
        lapsedHere = true;
        awayHere = true;
      }
    }
    if (lapsedHere) lapsedEver++;
    if (awayHere) awayUsers++;
  }

  const rate = (a, b) => (b > 0 ? a / b : null);
  const episodes = returned + away;
  return {
    today: todayKey,
    since: opts.since ?? null,
    users: usersWithRecords,
    retention: points.map((p) => ({
      day: p.n,
      eligible: p.eligible,
      exact: p.exact,
      exactRate: rate(p.exact, p.eligible),
      within: p.within,
      withinRate: rate(p.within, p.eligible),
    })),
    lapse: {
      thresholdDays: LAPSE_DAYS,
      episodes,
      returned,
      stillAway: away,
      returnRate: rate(returned, episodes),
      returnedWithin7: returnedIn7,
      returnedWithin7Rate: rate(returnedIn7, episodes),
      returnedWithin30: returnedIn30,
      returnedWithin30Rate: rate(returnedIn30, episodes),
      usersWithLapse: lapsedEver,
      usersStillAway: awayUsers,
    },
  };
}

const pct = (r) => (r === null ? "—" : `${(r * 100).toFixed(1)}%`);

/** 画面に出す整形（人数と割合だけ）。 */
export function formatReport(r) {
  const lines = [];
  lines.push(`集計日 ${r.today}（Asia/Tokyo）${r.since ? ` / ${r.since} 以降に始めた分だけ` : ""}`);
  lines.push(`記録のある人 ${r.users} 人`);
  lines.push("");
  lines.push("[継続率]  開始日から N 日後（まだ N 日たっていない人は分母に入れない）");
  for (const p of r.retention) {
    lines.push(
      `  ${String(p.day).padStart(2)}日後  ちょうど ${pct(p.exactRate)} (${p.exact}/${p.eligible})` +
        `   N日以内 ${pct(p.withinRate)} (${p.within}/${p.eligible})`,
    );
  }
  lines.push("");
  const l = r.lapse;
  lines.push(`[途切れた人が戻った率]  空き ${l.thresholdDays} 日以上を1回の途切れとして数える`);
  lines.push(`  途切れ ${l.episodes} 回（${l.usersWithLapse} 人）`);
  lines.push(`  戻った   ${pct(l.returnRate)} (${l.returned}/${l.episodes})`);
  lines.push(`  7日以内に戻った  ${pct(l.returnedWithin7Rate)} (${l.returnedWithin7}/${l.episodes})`);
  lines.push(`  30日以内に戻った ${pct(l.returnedWithin30Rate)} (${l.returnedWithin30}/${l.episodes})`);
  lines.push(`  いま離れている人 ${l.usersStillAway} 人`);
  return lines.join("\n");
}

export function parseArgs(argv) {
  const json = argv.includes("--json");
  const i = argv.indexOf("--since");
  let since = null;
  if (i !== -1) {
    since = argv[i + 1] ?? "";
    if (dayNumber(since) === null) throw new Error("--since には YYYY-MM-DD を指定してください");
  }
  return { json, since };
}

function loadEnv() {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

async function main() {
  const { json, since } = parseArgs(process.argv.slice(2));
  loadEnv();
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  const db = getFirestore();

  // 読み取りだけ。thoughts は date だけ、moods は ID だけ取る（本文はサーバーから来ない）。
  const byUser = new Map();
  const add = (doc, key) => {
    const userDoc = doc.ref.parent.parent;
    if (!userDoc || userDoc.parent.id !== "users") return; // users/{uid}/… 以外は無視
    let s = byUser.get(userDoc.id);
    if (!s) byUser.set(userDoc.id, (s = new Set()));
    s.add(key);
  };
  const [thoughts, moods] = await Promise.all([
    db.collectionGroup("thoughts").select("date").get(),
    db.collectionGroup("moods").select().get(),
  ]);
  for (const d of thoughts.docs) add(d, d.get("date"));
  for (const d of moods.docs) add(d, d.id);

  const report = computeRetention(byUser.values(), todayKeyJst(), { since });
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`プロジェクト: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}（読み取りのみ）\n`);
    console.log(formatReport(report));
  }
}

// import したとき（検証など）は main を走らせない
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
