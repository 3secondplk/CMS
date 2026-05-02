import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // DO NOT ignore build errors in production
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
