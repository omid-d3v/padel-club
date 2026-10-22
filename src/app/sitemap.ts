import type { MetadataRoute } from "next";
import { catalog, events } from "@/lib/platform/data";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [d, ev] = await Promise.all([catalog(), events()]);
  const base = siteUrl();
  const fixed = [
    "/",
    "/clubs",
    "/matches",
    "/events",
    "/leaderboard",
    "/help",
    "/terms",
    "/privacy",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
  }));
  return [
    ...fixed,
    ...d.clubs.map((c) => ({
      url: `${base}/clubs/${c.slug}`,
      lastModified: c.updated_at,
    })),
    ...d.cities
      .filter((c) => d.clubs.some((cl) => cl.city_id === c.id))
      .map((c) => ({ url: `${base}/cities/${c.slug}/padel` })),
    ...ev.rows
      .filter((e) => e.published && e.status !== "cancelled")
      .map((e) => ({ url: `${base}/events/${e.slug}` })),
  ];
}
