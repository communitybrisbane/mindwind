// 記録を消したとき、その記録の写しを相談の履歴と手紙から伏せる（サーバー専用。憲法第13条）。
// - 相談：chats/*/messages の assistant メッセージの refs で id が一致する要素を { id, date, deleted: true } にする
// - 手紙：letters/* の refs で thoughtId が一致する要素の quote を空にして deleted: true（手紙は残す。契約 §8）
// 返事の本文（AI がその記録を引いて書いた文）は、本人が受け取った会話なので残す。スレッドごと消す入口は既存どおり。
// 純粋な置き換えは lib/logic/deletedRefs.ts。Firestore は引数で受ける（Vitest で純粋部分だけ試せるように）。
import type { Firestore } from "firebase-admin/firestore";
import { scrubChatRefs, scrubLetterRefs } from "@/lib/logic/deletedRefs";

/** 1回の書き込みバッチに入れる上限（Firestore は 500） */
const BATCH_SIZE = 400;

type Update = { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> };

async function commitAll(db: Firestore, updates: Update[]): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + BATCH_SIZE)) batch.update(u.ref, u.data);
    await batch.commit();
  }
}

/** 相談の履歴に残る写しを伏せる。書き換えたメッセージ数を返す */
export async function scrubThoughtFromChats(db: Firestore, uid: string, thoughtId: string): Promise<number> {
  const chats = await db.collection(`users/${uid}/chats`).listDocuments();
  const updates: Update[] = [];
  for (const chat of chats) {
    const snap = await chat.collection("messages").where("role", "==", "assistant").get();
    for (const doc of snap.docs) {
      const { changed, refs } = scrubChatRefs(doc.get("refs"), thoughtId);
      if (changed) updates.push({ ref: doc.ref, data: { refs } });
    }
  }
  await commitAll(db, updates);
  return updates.length;
}

/** 手紙の引用を伏せる（手紙は残す）。書き換えた手紙の数を返す */
export async function scrubThoughtFromLetters(db: Firestore, uid: string, thoughtId: string): Promise<number> {
  const snap = await db.collection(`users/${uid}/letters`).get();
  const updates: Update[] = [];
  for (const doc of snap.docs) {
    const { changed, refs } = scrubLetterRefs(doc.get("refs"), thoughtId);
    if (changed) updates.push({ ref: doc.ref, data: { refs } });
  }
  await commitAll(db, updates);
  return updates.length;
}

/** 記録の削除の前に呼ぶ（冪等。途中で失敗したら記録は消さずに呼び出し側がエラーを返す） */
export async function scrubThoughtCopies(
  db: Firestore,
  uid: string,
  thoughtId: string
): Promise<{ chats: number; letters: number }> {
  const [chats, letters] = await Promise.all([
    scrubThoughtFromChats(db, uid, thoughtId),
    scrubThoughtFromLetters(db, uid, thoughtId),
  ]);
  return { chats, letters };
}
