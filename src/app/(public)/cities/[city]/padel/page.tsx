import { notFound } from "next/navigation";
import { catalog } from "@/lib/platform/data";
import { seo } from "@/lib/seo";
import { ClubCard } from "@/components/platform/cards";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const d = await catalog();
  const c = d.cities.find((c) => c.slug === city);
  return c
    ? seo(
        `رزرو زمین پدل ${c.name}`,
        `باشگاه‌های پدل ${c.name}؛ مقایسه امکانات، زمین‌ها و سانس‌های منتشرشده. ${c.description.slice(0, 70)}`,
        `/cities/${c.slug}/padel`,
      )
    : { title: "شهر پیدا نشد", robots: { index: false } };
}
export default async function City({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const d = await catalog();
  const c = d.cities.find((c) => c.slug === city);
  if (!c || !d.clubs.some((x) => x.city_id === c.id)) notFound();
  return (
    <section className="public-container public-page">
      <h1>زمین پدل در {c.name}</h1>
      <p className="intro">
        {c.description ||
          `باشگاه‌های منتشرشده ${c.name} را پیدا کنید و سانس بازی بعدی را با اطلاع از قیمت و شرایط تأیید درخواست کنید.`}
      </p>
      <div className="discovery-grid mt-9">
        {d.clubs
          .filter((x) => x.city_id === c.id)
          .map((club) => (
            <ClubCard key={club.id} club={club} city={c} courts={d.courts} />
          ))}
      </div>
    </section>
  );
}
