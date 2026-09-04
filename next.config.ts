import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force SSR - no static export
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.pokemon.com',
      },
      {
        protocol: 'https',
        hostname: 'img.pokemondb.net',
      },
      {
        protocol: 'https',
        hostname: 'archives.bulbagarden.net',
      },
      {
        protocol: 'https',
        hostname: 'assets.nintendo.com',
      },
    ],
  },
};

export default nextConfig;