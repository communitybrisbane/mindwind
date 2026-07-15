import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // クリックジャッキング防止（iframe への埋め込みを全面禁止）
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // MIME スニッフィング防止
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 外部への遷移時にフル URL を漏らさない
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 使わない強力な API を明示的に無効化（マイクは音声入力で使う）
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
