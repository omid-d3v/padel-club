import type { NextConfig } from "next";
const config: NextConfig = {
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  outputFileTracingIncludes: {
    "/opengraph-image": [
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff",
    ],
  },
  poweredByHeader: false,
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    cpus: process.env.DOCKER_BUILD === "true" ? 2 : undefined,
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            new URL(
              "/storage/v1/object/public/**",
              process.env.NEXT_PUBLIC_SUPABASE_URL,
            ),
          ]
        : []),
      {
        protocol: "https",
        hostname: "bcfbvxmwozmewshctzch.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
export default config;
