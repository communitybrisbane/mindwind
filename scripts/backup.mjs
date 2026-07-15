// Firestore の全データをローカル JSON に書き出すバックアップスクリプト（無料の PITR 代替）。
// プロジェクトが OneDrive 内にあるため、書き出したファイルは自動でクラウドにも同期される。
//
// 実行: node scripts/backup.mjs
// 出力: backups/backup-YYYY-MM-DDTHH-mm-ss.json（backups/ は gitignore 済み）

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// .env.local を読み込む（dotenv なしの最小実装）
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  process.env[m[1]] = v;
}

initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

/** ドキュメント＋全サブコレクションを再帰的に JSON 化する */
async function dumpDoc(docRef) {
  const snap = await docRef.get();
  const result = { data: snap.exists ? snap.data() : null, collections: {} };
  for (const col of await docRef.listCollections()) {
    result.collections[col.id] = await dumpCollection(col);
  }
  return result;
}

async function dumpCollection(colRef) {
  const out = {};
  for (const doc of (await colRef.get()).docs) {
    out[doc.id] = await dumpDoc(doc.ref);
  }
  return out;
}

const users = await dumpCollection(db.collection("users"));
const backup = {
  exportedAt: new Date().toISOString(),
  project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  users,
};

const dir = new URL("../backups", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = join(dir, `backup-${stamp}.json`);
writeFileSync(file, JSON.stringify(backup, null, 1));

const userCount = Object.keys(users).length;
const thoughtCount = Object.values(users).reduce(
  (sum, u) => sum + Object.keys(u.collections.thoughts ?? {}).length,
  0
);
console.log(`バックアップ完了: ${file}`);
console.log(`ユーザー ${userCount} 人 / 記録 ${thoughtCount} 件`);
