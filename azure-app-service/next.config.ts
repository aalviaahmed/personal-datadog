import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["yahoo-finance2"],
};

export default nextConfig;
