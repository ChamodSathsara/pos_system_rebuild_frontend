import type { NextConfig } from "next";

const isVercelBuild = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  // Electron needs a self-contained Node server. Vercel produces and traces its
  // own deployment output, so forcing standalone mode there can conflict with
  // Vercel's build pipeline.
  ...(isVercelBuild ? {} : { output: "standalone" as const }),
};

export default nextConfig;
