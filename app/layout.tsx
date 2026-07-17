import type { Metadata, Viewport } from "next";
import ThemeColor from "@/components/ThemeColor";
import "./globals.css";

export const metadata: Metadata = {
  // OGP 画像などの URL を絶対 URL にするための基準（LINE 等のプレビューに必要）
  metadataBase: new URL("https://mindwind.days-count.com"),
  title: "MindWind",
  description: "あなたが自分のメンターになる。日記と相談で自分のパターンを見つけるアプリ。",
  // ホーム画面に追加した PWA の起動設定（iOS）
  appleWebApp: {
    capable: true,
    title: "MindWind",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ネイティブアプリ同様、ピンチ拡大縮小を無効化（iOS の入力フォーカス時の自動ズームも防ぐ）
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // ステータスバー領域の色（スタート画面では ThemeColor が緑に切り替える）
  themeColor: "#f2f0eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="h-dvh flex justify-center">
        <ThemeColor />
        {/* アプリシェル: モバイルネイティブ設計（max-width 430px・基準 390×844） */}
        {/* シェルは画面高さに固定。長いチャットは各画面の内側でスクロールさせ、タブバーは常に画面下に留める */}
        <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-warm shadow-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
