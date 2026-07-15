// Firebase Admin SDK（API Routes 専用。クライアントから import しないこと）
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env.local では改行が \n の2文字で入っているため実際の改行に戻す
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export type AuthInfo = { uid: string; isGuest: boolean };

/**
 * Authorization: Bearer <idToken> を検証して uid とゲスト判定を返す。
 * 無効なら null（呼び出し側で 401 を返すこと）。
 * ゲスト判定はトークンの sign_in_provider を見るためクライアントから偽装できない。
 */
export async function verifyUserInfo(authHeader: string | null): Promise<AuthInfo | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    return { uid: decoded.uid, isGuest: decoded.firebase.sign_in_provider === "anonymous" };
  } catch {
    return null;
  }
}

/** uid だけ必要な場合の簡易版 */
export async function verifyUser(authHeader: string | null): Promise<string | null> {
  return (await verifyUserInfo(authHeader))?.uid ?? null;
}
