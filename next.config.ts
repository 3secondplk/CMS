import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
  },
});

const rawConfig: NextConfig = withPWA({
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  turbopack: {},
  headers: async () => [
    {
      source: "/manifest.json",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
      ],
    },
  ],
});

// Set allowedDevOrigins after PWA wrapper to prevent stripping
rawConfig.allowedDevOrigins = [
  "https://preview-chat-81648ac9-0c9e-4c02-911d-c7b0dd0b182f.space-z.ai",
];

export default rawConfig;
