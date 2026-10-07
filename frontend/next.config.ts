import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Let next/image optimize the remote photos our seed data hot-links.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
  // Proxy uploaded images through the frontend origin. The backend stores them
  // and serves /uploads/<file>; this makes them same-origin for next/image
  // (and avoids the optimizer's private-IP (SSRF) guard on 127.0.0.1).
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
  // The current scaffold default enables Cache Components + Partial Prefetching.
  // They are experimental and have caused serverless runtime crashes on Vercel,
  // and this app does not use `use cache` or server-side data fetching, so we
  // keep the deployment on the conventional, well-supported rendering model.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
