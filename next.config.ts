import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces the minimal self-contained Node server bundled by Electron.
  // `next dev` and the existing browser workflow are unaffected.
  output: "standalone",
};

export default nextConfig;
