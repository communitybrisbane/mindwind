// 古いゲスト（匿名ユーザー）の掃除スクリプト（PLAN 54）。
// 30日以上ログインのない匿名ユーザーを Auth から削除し、Firestore の users/{uid} 以下
// （thoughts・chunks・moods・letters・chats・draft など全サブコレクション）も recursiveDelete する。
//
// 実行（既定はドライラン＝何も消さず、対象を表示するだけ）:
//   npm run cleanup:guests                        # ドライラン
//   npm run cleanup:guests -- --days 45           # 日数を変える（既定30）
//   npm run cleanup:guests -- --apply             # 実際に消す（戻せない。先に npm run backup 推奨）
//
// 対象: providerData が空（Google 連携していない）の匿名ユーザーで、
//       最終ログイン（lastRefreshTime → lastSignInTime → 作成日の順）が閾値より古いもの。
// 消す順: Firestore → Auth。途中で失敗しても Auth が残るので、再実行で続きから消せる。
// 画面の「30日使わないと、記録が消えます」と一致させるため、既定は30日。

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin, loadEnv } from "./_admin.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 引数を解釈する。--apply が無ければドライラン。 */
export function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const i = argv.indexOf("--days");
  let days = 30;
  if (i !== -1) {
    days = Number(argv[i + 1]);
    if (!Number.isFinite(days) || days < 1) {
      throw new Error("--days には 1 以上の数を指定してください");
    }
  }
  return { apply, days };
}

/** 掃除対象か（匿名で、最後のログインが now - days より古い）。 */
export function isStaleGuest(user, now, days) {
  if (user.providerData && user.providerData.length > 0) return false; // 連携済み
  const m = user.metadata ?? {};
  const last = Date.parse(m.lastRefreshTime ?? m.lastSignInTime ?? m.creationTime ?? "");
  if (!Number.isFinite(last)) return false; // 日時が分からないものは消さない
  return now - last > days * DAY_MS;
}

async function main() {
  const { apply, days } = parseArgs(process.argv.slice(2));

  loadEnv();
  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  console.log(
    `プロジェクト: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n` +
      `モード: ${apply ? "APPLY（実際に消す）" : "ドライラン（何も消さない）"} / ${days}日以上ログインなし`,
  );

  const now = Date.now();
  const targets = [];
  let total = 0;
  let anonymous = 0;
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      total++;
      if (u.providerData.length === 0) anonymous++;
      if (isStaleGuest(u, now, days)) targets.push(u);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`全ユーザー ${total} 人 / 匿名 ${anonymous} 人 / 掃除対象 ${targets.length} 人`);
  for (const u of targets) {
    const last = u.metadata.lastRefreshTime ?? u.metadata.lastSignInTime ?? u.metadata.creationTime;
    console.log(`  - ${u.uid}  最終ログイン ${last}`);
  }

  if (!apply) {
    console.log("\nドライランなので何も消していません。消すときは --apply を付けてください。");
    return;
  }
  if (targets.length === 0) return;

  // 1) Firestore（サブコレクションごと）→ 2) Auth の順。失敗した人は Auth が残るので再実行できる。
  const deleted = [];
  const failed = [];
  const fsFailed = [];
  for (const u of targets) {
    try {
      await db.recursiveDelete(db.doc(`users/${u.uid}`));
      deleted.push(u.uid);
    } catch (e) {
      fsFailed.push(u.uid);
      console.error(`Firestore 削除に失敗: ${u.uid}`, e);
    }
  }
  for (let i = 0; i < deleted.length; i += 1000) {
    const res = await auth.deleteUsers(deleted.slice(i, i + 1000));
    for (const err of res.errors) {
      failed.push(deleted[i + err.index]);
      console.error(`Auth 削除に失敗: ${deleted[i + err.index]}`, err.error);
    }
  }
  const failedAll = [...fsFailed, ...failed];
  console.log(`\n完了: 削除 ${deleted.length - failed.length} 人 / 失敗 ${failedAll.length} 人（再実行で続きから消せます）`);
  if (failedAll.length > 0) process.exitCode = 1;
}

// テストから import されたときは実行しない
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
