import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = withPWA({
  output: "standalone",
  typescript: {
    // DO NOT ignore build errors in production
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  turbopack: {},
  // Vercel handles headers via next.config or vercel.json
  headers: async () => [
    {
      source: "/manifest.json",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
      ],
    },
  ],
});

export default nextConfig;
