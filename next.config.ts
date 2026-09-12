import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack doesn't get
  // confused by an unrelated package-lock.json living further up the
  // user's home directory tree.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
