import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloud Run: produces a minimal self-contained server in .next/standalone
  output: 'standalone',
};

export default nextConfig;
