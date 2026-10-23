// 既存の thoughts（rawText・深掘り）から chunks を作る移行スクリプト（PLAN タスク 59）。
// - デフォルトは dry-run（件数を表示するだけ。OpenAI も呼ばない・書き込まない）。
// - 冪等：chunks/{thoughtId}_{order} の id は決め打ち。その記録のチャンクが 1 つでもあれば記録ごとスキップし、
//   書くときも create() なので既存のチャンクは上書きしない（二重に作らない）。
// - 旧 6 項目（event / thinking / action / reason / emotion / values）と旧 embedding は消さない・触らない。
// - 分け方は lib/logic/chunk.ts の splitIntoChunks、quick の meta は lib/logic/moods.ts の moodMetaLine を使う（Node の型除去で .ts を直接 import）。
// - embedding は OpenAI text-embedding-3-small（1536次元）。入力は meta があれば `${text}\n${meta}`、なければ text。
//
// 使い方:
//   npm run backup                                  ← 本実行の前に必ず（Firestore 全体を backups/ へ）
//   node scripts/backfill-chunks.mjs                （dry-run）
//   node scripts/backfill-chunks.mjs --apply        （本実行）
//   node scripts/backfill-chunks.mjs --apply --uid=<uid>   （1 ユーザーだけ）
//
// package.json の scripts に足す行（タスク 59 の担当に含まれる。指揮官が反映する）:
//   "backfill-chunks": "node scripts/backfill-chunks.mjs",
//
// 実行はこのスクリプトを書いた段階では行っていない。手順は docs/OPS-backfill-chunks.md。

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { splitIntoChunks } from "../lib/logic/chunk.ts";
import { isMoodId, moodMetaLine } from "../lib/logic/moods.ts";

const apply = process.argv.includes("--apply");
const onlyUid = process.argv.find((a) => a.startsWith("--uid="))?.slice("--uid=".length) || null;
const BATCH_SIZE = 100;
const EMBED_BATCH = 50;
const EMBED_RETRIES = 3;

// .env.local を読み込む（dotenv なしの最小実装）
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  process.env[m[1]] = v;
}

if (apply && !process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY が .env.local にありません。中止します。");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

async function embedMany(inputs) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }
    if (attempt >= EMBED_RETRIES) throw new Error(`embeddings API ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

console.log("事前に npm run backup を実行しましたか？ 本実行（--apply）の前に必ず取ってください。");
console.log(apply ? "モード: --apply（書き込みます）" : "モード: dry-run（書き込みません。--apply で実行）");
if (onlyUid) console.log(`対象: uid=${onlyUid} のみ`);

let totalThoughts = 0;
let alreadyDone = 0;
let skippedInvalid = 0;
let noChunks = 0;
const plans = []; // { chunkRef, data, embedInput }

const userRefs = onlyUid ? [db.collection("users").doc(onlyUid)] : await db.collection("users").listDocuments();
for (const userRef of userRefs) {
  // 既存チャンクの thoughtId を集める（冪等：1 つでもあればその記録はスキップ）
  const existing = new Set();
  const chunkSnap = await userRef.collection("chunks").select("thoughtId").get();
  for (const d of chunkSnap.docs) existing.add(d.get("thoughtId") ?? d.id.replace(/_\d+$/, ""));

  const thoughtSnap = await userRef.collection("thoughts").get();
  for (const doc of thoughtSnap.docs) {
    totalThoughts++;
    if (existing.has(doc.id)) {
      alreadyDone++;
      continue;
    }
    const t = doc.data();
    const rawText = typeof t.rawText === "string" ? t.rawText : "";
    const date = typeof t.date === "string" ? t.date : "";
    if (!date || (!rawText.trim() && !(typeof t.deepDiveAnswer === "string" && t.deepDiveAnswer.trim()))) {
      skippedInvalid++;
      continue;
    }
    const kind = t.kind === "quick" ? "quick" : "full";
    const pieces = splitIntoChunks({
      rawText,
      deepDiveQuestion: typeof t.deepDiveQuestion === "string" ? t.deepDiveQuestion : "",
      deepDiveAnswer: typeof t.deepDiveAnswer === "string" ? t.deepDiveAnswer : "",
      kind,
    });
    if (pieces.length === 0) {
      noChunks++;
      continue;
    }
    const meta = kind === "quick" && isMoodId(t.mood) ? moodMetaLine(t.mood) : undefined;
    const createdAt = t.createdAt instanceof Timestamp ? t.createdAt : Timestamp.now();
    for (const p of pieces) {
      const withMeta = meta && p.source === "diary" ? meta : undefined; // quick の一言にだけ meta を付ける
      plans.push({
        chunkRef: userRef.collection("chunks").doc(`${doc.id}_${p.order}`),
        data: {
          thoughtId: doc.id,
          date,
          text: p.text,
          source: p.source,
          order: p.order,
          ...(withMeta ? { meta: withMeta } : {}),
          createdAt,
        },
        embedInput: withMeta ? `${p.text}\n${withMeta}` : p.text,
      });
    }
  }
}

const targetThoughts = new Set(plans.map((p) => p.data.thoughtId + "@" + p.chunkRef.parent.parent.id)).size;
console.log(
  `記録 ${totalThoughts} 件 / 作成対象 ${targetThoughts} 件（チャンク ${plans.length} 個） / 作成済みでスキップ ${alreadyDone} 件 / 本文なしでスキップ ${skippedInvalid + noChunks} 件`,
);
console.log("旧 6 項目フィールドと旧 embedding は残します（触りません）。");

if (!apply) {
  console.log("dry-run のため書き込みなし。--apply で実行します。");
} else {
  let done = 0;
  let skippedExisting = 0;
  for (let i = 0; i < plans.length; i += BATCH_SIZE) {
    const slice = plans.slice(i, i + BATCH_SIZE);
    const vectors = [];
    for (let j = 0; j < slice.length; j += EMBED_BATCH) {
      vectors.push(...(await embedMany(slice.slice(j, j + EMBED_BATCH).map((p) => p.embedInput))));
    }
    const batch = db.batch();
    slice.forEach((p, k) => batch.create(p.chunkRef, { ...p.data, embedding: FieldValue.vector(vectors[k]) }));
    try {
      await batch.commit();
      done += slice.length;
    } catch (e) {
      // 並行して作られた等で ALREADY_EXISTS のとき：1 件ずつ create して既存だけ飛ばす
      if (e?.code !== 6) throw e;
      for (let k = 0; k < slice.length; k++) {
        try {
          await slice[k].chunkRef.create({ ...slice[k].data, embedding: FieldValue.vector(vectors[k]) });
          done++;
        } catch (e2) {
          if (e2?.code !== 6) throw e2;
          skippedExisting++;
        }
      }
    }
    console.log(`  ${done} / ${plans.length} チャンク 作成済み`);
  }
  console.log(`移行完了（作成 ${done} / 既存でスキップ ${skippedExisting}）。もう一度実行しても二重には作りません。`);
}
