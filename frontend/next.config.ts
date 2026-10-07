import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow next/image to optimize the remote photos our seed data hot-links.
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
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/uploads/:path*`,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
