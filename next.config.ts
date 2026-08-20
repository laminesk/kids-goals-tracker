import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force SSR - no static export
  output: 'standalone',
};

export default nextConfig;