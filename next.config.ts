import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false, // keep the dev "N" badge out of the demo recording
  // /api/explain reads these with fs at request time; make sure deploys bundle them.
  outputFileTracingIncludes: {
    "/api/explain": ["./data/explain-cache.json", "./data/claude_context.md"],
  },
};

export default nextConfig;
