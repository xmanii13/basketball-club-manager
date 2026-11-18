import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  agentRules: false,
  // identity.dev.js ships beside identity.dev.ts for Turbopack resolution.
  turbopack: {},
};

export default nextConfig;
