import type { MetadataRoute } from "next";

// ホーム画面に追加（PWA）したときのアプリ情報
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindWind",
    short_name: "MindWind",
    description: "あなたが自分のメンターになる、日記×AI相談アプリ",
    start_url: "/",
    display: "standalone",
    // 革の机（契約 §2：felt2 / felt）
    background_color: "#232f21",
    theme_color: "#34492f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
