import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // DO NOT ignore build errors in production
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  turbopack: {},
};

export default nextConfig;
