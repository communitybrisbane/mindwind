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

// 認証実装まで（Phase 6）の開発用固定ユーザー。本番ビルドでは必ず null
const DEV_UID = process.env.NODE_ENV === "development" ? "dev-user" : null;

/**
 * Authorization: Bearer <idToken> を検証して uid を返す。
 * 無効なら null（呼び出し側で 401 を返すこと）。
 * dev 環境ではトークンなし・無効時に固定 uid にフォールバックする。
 */
export async function verifyUser(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return DEV_UID;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    return decoded.uid;
  } catch {
    return DEV_UID;
  }
}
