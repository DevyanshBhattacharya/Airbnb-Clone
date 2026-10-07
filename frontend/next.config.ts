import type { NextConfig } from "next";

const RAW_API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
// "same-origin" means the API is a sibling Vercel Service at /api on this domain.
const API_URL = RAW_API === "same-origin" ? "" : RAW_API.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Let next/image optimize the remote photos our seed data hot-links.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
  // In local dev, uploaded images are served by the FastAPI origin, so proxy
  // /uploads through Next to keep them same-origin for next/image. Under Vercel
  // Services (same-origin), top-level routing already sends /uploads to the
  // backend, so no rewrite is needed.
  async rewrites() {
    if (!API_URL) return [];
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
