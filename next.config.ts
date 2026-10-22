import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bcfbvxmwozmewshctzch.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
export default config;
