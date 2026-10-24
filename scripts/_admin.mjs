// scripts/*.mjs 共通：.env.local の読み込みと Firebase Admin の初期化。

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";

/** .env.local を process.env に読み込む（dotenv なしの最小実装）。 */
export function loadEnv() {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

/** process.env のサービスアカウント情報で Firebase Admin を初期化する（先に loadEnv を呼ぶ）。 */
export function initAdmin() {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
