import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindWind",
  description: "あなたが自分のメンターになる。日記と相談で自分のパターンを見つけるアプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="h-dvh flex justify-center">
        {/* アプリシェル: モバイルネイティブ設計（max-width 430px・基準 390×844） */}
        {/* シェルは画面高さに固定。長いチャットは各画面の内側でスクロールさせ、タブバーは常に画面下に留める */}
        <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-warm shadow-[0_0_6px_rgba(0,0,0,0.24),0_8px_12px_rgba(0,0,0,0.14)]">
          {children}
        </div>
      </body>
    </html>
  );
}
