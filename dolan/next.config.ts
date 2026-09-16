import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@dolan/shared", "zod"],
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    const origin = (process.env.EXPRESS_ORIGIN ?? "http://localhost:4000").replace(/\/$/, "");
    return [
      { source: "/socket.io", destination: `${origin}/socket.io` },
      { source: "/socket.io/:path*", destination: `${origin}/socket.io/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "thumb.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
