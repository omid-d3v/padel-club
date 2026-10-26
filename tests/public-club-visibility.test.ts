import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("PUBLIC_404");
  },
  redirect: () => {
    throw new Error("REDIRECT");
  },
}));
vi.mock("../src/lib/platform/request-time", () => ({
  requestTime: async () => Date.now(),
}));
vi.mock("../src/lib/supabase/server", () => ({
  configured: () => true,
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: null, error: null }) },
    from: (table: string) => ({
      select: () => ({
        limit: async () => ({
          error: null,
          // Deliberately return privileged rows, as an admin/organizer session can.
          data:
            (
              {
                cities: [{ id: "city", slug: "city", name: "شهر" }],
                clubs: [
                  {
                    id: "on",
                    slug: "active-club",
                    city_id: "city",
                    published: true,
                    updated_at: "2026-10-26",
                  },
                  {
                    id: "off",
                    slug: "disabled-club",
                    city_id: "city",
                    published: false,
                    updated_at: "2026-10-26",
                  },
                ],
                courts: [
                  { id: "court-on", club_id: "on", active: true },
                  { id: "court-off", club_id: "off", active: true },
                ],
                equipment: [
                  { id: "item-on", club_id: "on", active: true },
                  { id: "item-off", club_id: "off", active: true },
                ],
                platform_events: [
                  {
                    id: "event-on",
                    slug: "active-event",
                    club_id: "on",
                    published: true,
                    status: "registration",
                  },
                  {
                    id: "event-off",
                    slug: "disabled-event",
                    club_id: "off",
                    published: true,
                    status: "registration",
                  },
                ],
              } as Record<string, unknown[]>
            )[table] ?? [],
        }),
      }),
    }),
  }),
}));
import { catalog, events } from "../src/lib/platform/data";
import sitemap from "../src/app/sitemap";
import Club from "../src/app/(public)/clubs/[slug]/page";
import Book from "../src/app/(public)/clubs/[slug]/book/page";
import Event from "../src/app/(public)/events/[slug]/page";

it("filters inactive club dependencies even when RLS permits an admin's underlying read", async () => {
  const d = await catalog();
  expect(d.clubs.map((c) => c.id)).toEqual(["on"]);
  expect(d.courts.map((c) => c.id)).toEqual(["court-on"]);
  expect(d.equipment.map((c) => c.id)).toEqual(["item-on"]);
  expect((await events()).rows.map((e) => e.id)).toEqual(["event-on"]);
});
it("returns not-found for known inactive club, booking and associated event URLs", async () => {
  await expect(
    Club({ params: Promise.resolve({ slug: "disabled-club" }) }),
  ).rejects.toThrow("PUBLIC_404");
  await expect(
    Book({
      params: Promise.resolve({ slug: "disabled-club" }),
      searchParams: Promise.resolve({ court: "court-off" }),
    }),
  ).rejects.toThrow("PUBLIC_404");
  await expect(
    Event({ params: Promise.resolve({ slug: "disabled-event" }) }),
  ).rejects.toThrow("PUBLIC_404");
});
it("does not publish inactive club or event links in the sitemap", async () => {
  const links = (await sitemap()).map((item) => item.url);
  expect(links.some((url) => url.endsWith("/clubs/active-club"))).toBe(true);
  expect(links.some((url) => url.endsWith("/clubs/disabled-club"))).toBe(false);
  expect(links.some((url) => url.endsWith("/events/disabled-event"))).toBe(
    false,
  );
});
