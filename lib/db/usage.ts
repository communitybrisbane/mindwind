// 1日あたりの AI 利用回数（サーバー専用）。users/{uid}/usage/{YYYY-MM-DD}（Asia/Tokyo）に種別ごとに数える
import { FieldValue } from "firebase-admin/firestore";
import { tokyoDateKey } from "@/lib/logic/date";
import { adminDb } from "./admin";

/**
 * 成形（shape）は廃止したので数えない（旧データの shape フィールドは残っていても読まない）。
 * meta は検索用メタの生成（PLAN 57。保存・編集のあと裏で1回。上限は lib/ai/meta.ts の metaLimitFor）
 */
export type QuotaKind = "deepdive" | "consult" | "record" | "letter" | "meta";

/**
 * 利用枠を1つ消費する。上限到達なら null、消費できたら返金関数を返す。
 * 読み取り→加算をトランザクションで行い、同時リクエストでも上限を超えない。
 * refund は消費した日付のドキュメントに戻す（日付をまたいでも別の日を減らさない）。
 */
export async function consumeQuota(
  uid: string,
  kind: QuotaKind,
  limit: number
): Promise<null | { dateKey: string; refund: () => Promise<void> }> {
  const dateKey = tokyoDateKey(new Date());
  const ref = adminDb.doc(`users/${uid}/usage/${dateKey}`);
  const ok = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used: number = snap.get(kind) ?? 0;
    if (used >= limit) return false;
    tx.set(ref, { [kind]: used + 1 }, { merge: true });
    return true;
  });
  if (!ok) return null;
  return { dateKey, refund: () => refundQuota(uid, kind, dateKey) };
}

/**
 * 消費した枠を1つ戻す（消費した日付のドキュメントに戻す）。
 * 別のリクエストが消費した枠を戻すとき（止まった手紙の生成を作り直すときなど）に、日付を指定して呼ぶ。
 */
export async function refundQuota(uid: string, kind: QuotaKind, dateKey: string): Promise<void> {
  await adminDb
    .doc(`users/${uid}/usage/${dateKey}`)
    .set({ [kind]: FieldValue.increment(-1) }, { merge: true })
    .catch((e) => console.error("quota refund failed:", e));
}
