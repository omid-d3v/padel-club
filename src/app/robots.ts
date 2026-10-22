import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/checkout",
        "/api/",
        "/auth/",
        "/login",
        "/register",
        "/reset-password",
        "/forgot-password",
        "/players",
        "/tournaments/new",
        "/setup",
        "/clubs/*/book",
        "/*?*",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
