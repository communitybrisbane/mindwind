// thoughts の embedding（number 配列）を Firestore のベクトル型に書き換える一回限りの移行スクリプト。
// 既にベクトル型のドキュメントはスキップする。デフォルトは dry-run（件数を表示するだけ）。
//
// 実行: node scripts/migrate-embeddings.mjs            （dry-run）
//       node scripts/migrate-embeddings.mjs --apply    （実際に書き込む。事前に npm run backup 推奨）

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
const BATCH_SIZE = 400;

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

console.log(apply ? "モード: --apply（書き込みます）" : "モード: dry-run（書き込みません。--apply で実行）");

let total = 0;
let alreadyVector = 0;
let noEmbedding = 0;
const targets = []; // { ref, embedding }

for (const userRef of await db.collection("users").listDocuments()) {
  const snap = await userRef.collection("thoughts").get();
  for (const doc of snap.docs) {
    total++;
    const value = doc.get("embedding");
    if (Array.isArray(value)) targets.push({ ref: doc.ref, embedding: value });
    else if (value && typeof value.toArray === "function") alreadyVector++;
    else noEmbedding++;
  }
}

console.log(`記録 ${total} 件 / 変換対象（配列） ${targets.length} 件 / ベクトル型済み ${alreadyVector} 件 / embedding なし ${noEmbedding} 件`);

if (apply) {
  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { ref, embedding } of targets.slice(i, i + BATCH_SIZE)) {
      batch.update(ref, { embedding: FieldValue.vector(embedding) });
    }
    await batch.commit();
    done += Math.min(BATCH_SIZE, targets.length - i);
    console.log(`  ${done} / ${targets.length} 件 書き換え済み`);
  }
  console.log("移行完了");
}
