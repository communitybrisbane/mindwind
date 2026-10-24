import { FieldValue } from "firebase-admin/firestore";
import { after, NextRequest, NextResponse } from "next/server";
import type { CreateThoughtResponse, ThoughtsListResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser, verifyUserInfo } from "@/lib/db/admin";
import { prepareChunks, writeChunks } from "@/lib/db/chunks";
import { refreshThoughtMeta } from "@/lib/db/chunkStore";
import { consumeQuota } from "@/lib/db/usage";
import { resolveRecordDate } from "@/lib/logic/backdate";
import { detectCrisis } from "@/lib/logic/crisis";
import { tokyoDateKey } from "@/lib/logic/date";
import { recordLimitFor } from "@/lib/logic/limits";
import { toMood } from "@/lib/logic/quickRecord";
import {
  INPUT_ERROR_STATUS,
  parseCreateThought,
  sortNewestFirst,
  toThoughtSummary,
} from "@/lib/logic/recordText";
import { autoTitle } from "@/lib/logic/title";

export const maxDuration = 30;

/** 記録一覧（新しい順・最大2000・embedding は返さない）。?date=YYYY-MM-DD でその日の分だけ */
export async function GET(req: NextRequest) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thoughts = adminDb.collection(`users/${uid}/thoughts`);
  const dateParam = req.nextUrl.searchParams.get("date");

  if (dateParam !== null) {
    const resolved = resolveRecordDate(dateParam, tokyoDateKey(new Date()));
    if (!resolved.ok || dateParam === "") {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    // その日の分は多くても日次上限ぶん。並べ替えはメモリで行う（複合インデックスを増やさない）
    const snap = await thoughts.where("date", "==", resolved.date).get();
    const body: ThoughtsListResponse = {
      thoughts: sortNewestFirst(snap.docs.map((d) => toThoughtSummary(d.id, d.data()))),
    };
    return NextResponse.json(body);
  }

  // ストリーク・カレンダーの正確性のため十分に大きく取る（1日30件×1年でも余裕）
  const snap = await thoughts.orderBy("createdAt", "desc").limit(2000).get();
  const body: ThoughtsListResponse = { thoughts: snap.docs.map((d) => toThoughtSummary(d.id, d.data())) };
  return NextResponse.json(body);
}

/**
 * 記録の保存（full＝日記＋深掘り／quick＝一言）。本人の文章はそのまま保存し、
 * lib/logic/chunk.ts でチャンクに分けて、チャンクごとの embedding を users/{uid}/chunks に書く。
 * 成形（AI）は使わない。タイトルは本文の先頭から自動。
 * full は保存のあと after() で検索用メタを裏で作り、チャンクの embedding を作り直す（PLAN 57。失敗しても保存は成功のまま）。
 * quick は AI を通らないので、危機の言葉を見つけたら（lib/logic/crisis.ts）保存は成功させたうえで crisis: true を返し、
 * 画面が窓口を案内する（PLAN 85・憲法第8条）。
 */
export async function POST(req: NextRequest) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid, isGuest } = authInfo;

  const body = await req.json().catch(() => null);
  const todayKey = tokyoDateKey(new Date());
  const parsed = parseCreateThought(body, todayKey);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: INPUT_ERROR_STATUS });
  const { rawText, deepDiveQuestion, deepDiveAnswer, kind, date, isPast } = parsed.value;

  const userDoc = adminDb.doc(`users/${uid}`);
  const thoughts = userDoc.collection("thoughts");

  // 1日の記録上限（書いた日基準・Asia/Tokyo）。AI 呼び出しと同じ原子カウンタで数える。
  // 削除しても枠は戻らない（書き込み回数の上限）。過去日付の記録も「今日書いた1件」
  const quota = await consumeQuota(uid, "record", recordLimitFor(isGuest));
  if (!quota) return NextResponse.json({ error: "daily_limit" }, { status: 409 });

  try {
    // 一言は、その日の気分を表示用に持ち、チャンクの検索用メタにも固定の一行で入れる（AI は呼ばない）
    const mood =
      kind === "quick" ? toMood((await userDoc.collection("moods").doc(date).get()).get("mood")) : undefined;

    const docRef = thoughts.doc();
    const title = autoTitle(rawText);
    // embedding（AI 呼び出し）はトランザクションの外で先に作る
    const chunks = await prepareChunks({
      thoughtId: docRef.id,
      date,
      rawText,
      deepDiveQuestion,
      deepDiveAnswer,
      kind,
      mood,
    });

    // 過去日の重複チェック・thought の保存・チャンクの保存を1トランザクションで行う
    const saved = await adminDb.runTransaction(async (tx) => {
      // 過去日は1日1件まで（すでに記録がある日には追記できない。削除→書き直しで対応）
      if (isPast) {
        const taken = await tx.get(thoughts.where("date", "==", date).limit(1));
        if (!taken.empty) return false;
      }
      tx.set(docRef, {
        date,
        rawText,
        deepDiveQuestion,
        deepDiveAnswer,
        title,
        kind,
        ...(mood !== undefined ? { mood } : {}),
        tags: [],
        createdAt: FieldValue.serverTimestamp(),
      });
      writeChunks(tx, adminDb, uid, chunks);
      return true;
    });

    if (!saved) {
      await quota.refund();
      return NextResponse.json({ error: "date_taken" }, { status: 409 });
    }
    if (kind === "full") after(() => refreshThoughtMeta(uid, docRef.id, isGuest));
    const res: CreateThoughtResponse & { crisis?: true } = {
      id: docRef.id,
      title,
      date,
      ...(kind === "quick" && detectCrisis(rawText) ? { crisis: true as const } : {}),
    };
    return NextResponse.json(res);
  } catch (e) {
    console.error("save thought failed:", e);
    await quota.refund();
    return NextResponse.json({ error: "save_failed" }, { status: 502 });
  }
}
