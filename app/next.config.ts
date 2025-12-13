import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack 설정 (Next.js 16 기본)
  turbopack: {
    // TypeScript 경로 별칭은 tsconfig.json에서 자동으로 처리됨
  },
};

export default nextConfig;
