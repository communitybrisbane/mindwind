import { after, NextRequest, NextResponse } from "next/server";
import type { DeleteThoughtResponse, ThoughtResponse, UpdateThoughtResponse } from "@/lib/api/contracts";
import { adminDb, verifyUser, verifyUserInfo } from "@/lib/db/admin";
import { deleteChunksInTx, getChunkIdsInTx, prepareChunks, writeChunks } from "@/lib/db/chunks";
import { refreshThoughtMeta } from "@/lib/db/chunkStore";
import { scrubThoughtCopies } from "@/lib/db/scrubDeleted";
import { toMood } from "@/lib/logic/quickRecord";
import { INPUT_ERROR_STATUS, parseUpdateThought, toThoughtSummary } from "@/lib/logic/recordText";
import { autoTitle } from "@/lib/logic/title";

export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

/** 旧 recordChat（廃止）のメッセージ。削除時に旧データから記録の写しを消すためだけに読む */
type LegacyRecordChatMessage = { type?: string; thoughtId?: string };

/** 1件の記録（本人の文章＋深掘りの質問と答え。embedding は返さない） */
export async function GET(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const snap = await adminDb.doc(`users/${uid}/thoughts/${id}`).get();
  if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body: ThoughtResponse = { thought: toThoughtSummary(snap.id, snap.data() ?? {}) };
  return NextResponse.json(body);
}

/**
 * 記録の編集：本文・深掘りの質問と答えを直す → タイトルを作り直す → チャンクを作り直して embedding を再生成。
 * 日付・kind は変えない。full の検索用メタは、書いたあと after() で裏で作り直す（PLAN 57。失敗しても編集は成功のまま）。
 * embedding はトランザクションの外で作るので、その間に別の画面が同じ記録を直していたら（updateTime が変わっていたら）
 * 書かずに 409 conflict を返す（本文とチャンクがずれないように）。
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const authInfo = await verifyUserInfo(req.headers.get("authorization"));
  if (!authInfo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid, isGuest } = authInfo;

  const body = await req.json().catch(() => null);
  const { id } = await params;
  const docRef = adminDb.doc(`users/${uid}/thoughts/${id}`);

  try {
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const data = snap.data() ?? {};
    const current = toThoughtSummary(id, data);
    const readAt = snap.updateTime;

    const parsed = parseUpdateThought(body, current);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: INPUT_ERROR_STATUS });
    const { rawText, deepDiveQuestion, deepDiveAnswer } = parsed.value;
    const title = autoTitle(rawText);

    // embedding（AI 呼び出し）はトランザクションの外で先に作る
    const chunks = await prepareChunks({
      thoughtId: id,
      date: current.date,
      rawText,
      deepDiveQuestion,
      deepDiveAnswer,
      kind: current.kind,
      mood: toMood(data.mood),
    });

    // thought の更新とチャンクの置き換え（余った order の削除）を1トランザクションで行う
    const outcome = await adminDb.runTransaction(async (tx): Promise<"ok" | "not_found" | "conflict"> => {
      const fresh = await tx.get(docRef);
      if (!fresh.exists) return "not_found";
      if (readAt && fresh.updateTime && !fresh.updateTime.isEqual(readAt)) return "conflict";
      const existingIds = await getChunkIdsInTx(tx, adminDb, uid, id);
      tx.update(docRef, { rawText, deepDiveQuestion, deepDiveAnswer, title });
      writeChunks(tx, adminDb, uid, chunks, existingIds);
      return "ok";
    });
    if (outcome === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (outcome === "conflict") return NextResponse.json({ error: "conflict" }, { status: 409 });
    if (current.kind === "full") after(() => refreshThoughtMeta(uid, id, isGuest));

    const res: UpdateThoughtResponse = { ok: true, title };
    return NextResponse.json(res);
  } catch (e) {
    console.error("update thought failed:", e);
    return NextResponse.json({ error: "update_failed" }, { status: 502 });
  }
}

/**
 * 記録の完全削除（憲法第13条）：thought とそのチャンクを全部消す。
 * 先に、相談の「読み返したページ」と手紙の引用に残る写しを伏せる（失敗したら記録は消さずに 502。やり直せば続きから伏せる）。
 * 旧 recordChat に残る写しも取り除く。
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const uid = await verifyUser(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const userDoc = adminDb.doc(`users/${uid}`);
  const docRef = userDoc.collection("thoughts").doc(id);

  try {
    await scrubThoughtCopies(adminDb, uid, id);
  } catch (e) {
    console.error("scrub deleted thought copies failed:", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 502 });
  }

  const found = await adminDb.runTransaction(async (tx) => {
    // 読み取りを先にまとめる（トランザクションは読み → 書きの順）
    const [snap, userSnap, chunkIds] = await Promise.all([
      tx.get(docRef),
      tx.get(userDoc),
      getChunkIdsInTx(tx, adminDb, uid, id),
    ]);
    if (!snap.exists && chunkIds.length === 0) return false;

    tx.delete(docRef);
    deleteChunksInTx(tx, adminDb, uid, chunkIds);

    // 旧 recordChat（廃止）に同じ記録のカードがあれば、そのセッション（前カード直後〜このカード）を取り除く
    const recordChat = userSnap.get("recordChat");
    const messages = recordChat?.messages as LegacyRecordChatMessage[] | undefined;
    if (messages?.some((m) => m.thoughtId === id)) {
      const kept: LegacyRecordChatMessage[] = [];
      let buffer: LegacyRecordChatMessage[] = [];
      for (const message of messages) {
        buffer.push(message);
        if (message.type === "card") {
          if (message.thoughtId !== id) kept.push(...buffer);
          buffer = [];
        }
      }
      kept.push(...buffer);
      tx.set(userDoc, { recordChat: { date: recordChat.date, messages: kept } }, { merge: true });
    }
    return true;
  });
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const res: DeleteThoughtResponse = { ok: true };
  return NextResponse.json(res);
}
