import type { Metadata, Viewport } from "next";
import ThemeColor from "@/components/ThemeColor";
import SvgDefs from "@/components/ui/SvgDefs";
import FeedbackBoot from "@/components/ui/FeedbackBoot";
import { ToastHost } from "@/components/ui/Toast";
import { fontVariables } from "@/app/fonts";
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
  // ステータスバー領域の色（革の机。静的ページでは ThemeColor が生成りに切り替える）
  themeColor: "#34492f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${fontVariables} h-full antialiased`}>
      <body className="h-dvh flex justify-center">
        {/* 新 UI の SVG フィルター（#pencil #wc #ink #deckle #logoink）。ここに1回だけ置く */}
        <SvgDefs />
        <ThemeColor />
        {/* 最初のタップで音を解錠し、「動きをへらす」で <html class="rm"> を付ける（描画なし） */}
        <FeedbackBoot />
        {/* アプリシェル: モバイルネイティブ設計（max-width 430px・基準 390×844） */}
        {/* シェルは画面高さに固定。長いチャットは各画面の内側でスクロールさせ、タブバーは常に画面下に留める */}
        <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-warm shadow-shell">
          {children}
          {/* 机の上の黒い札（absolute なのでシェルの中に置く） */}
          <ToastHost />
        </div>
      </body>
    </html>
  );
}
