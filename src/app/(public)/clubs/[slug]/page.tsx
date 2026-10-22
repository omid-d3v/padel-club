import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog } from "@/lib/platform/data";
import { seo, jsonLd, siteUrl } from "@/lib/seo";
import { money } from "@/lib/platform/format";
import { Button } from "@/components/ui/button";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await catalog();
  const club = d.clubs.find((c) => c.slug === slug);
  return club
    ? seo(
        `${club.name} | رزرو زمین پدل`,
        `${club.name} در ${d.cities.find((c) => c.id === club.city_id)?.name ?? "شهر شما"}؛ ${club.description.slice(0, 120)}`,
        `/clubs/${club.slug}`,
      )
    : { title: "باشگاه پیدا نشد", robots: { index: false } };
}
export default async function Club({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await catalog();
  const c = d.clubs.find((c) => c.slug === slug);
  if (!c) notFound();
  const city = d.cities.find((x) => x.id === c.city_id);
  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: c.name,
    description: c.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address,
      addressLocality: city?.name,
      addressCountry: "IR",
    },
    url: `${siteUrl()}/clubs/${c.slug}`,
    ...(c.latitude !== null && c.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: c.latitude,
            longitude: c.longitude,
          },
        }
      : {}),
  };
  return (
    <section className="public-container public-page">
      <nav
        aria-label="مسیر صفحه"
        className="mb-6 text-xs text-muted-foreground"
      >
        <Link href="/clubs">باشگاه‌ها</Link> /{" "}
        {city && <Link href={`/cities/${city.slug}/padel`}>{city.name}</Link>} /{" "}
        {c.name}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "باشگاه‌ها",
                item: `${siteUrl()}/clubs`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: c.name,
                item: `${siteUrl()}/clubs/${c.slug}`,
              },
            ],
          }),
        }}
      />
      <h1>{c.name}</h1>
      <p className="intro">{c.description}</p>
      <div className="content-grid">
        <div className="space-y-6">
          <div className="platform-card">
            <h2>زمین‌ها و سانس‌ها</h2>
            {d.courts
              .filter((x) => x.club_id === c.id)
              .map((court) => (
                <div key={court.id} className="booking-row">
                  <div>
                    <b>{court.name}</b>
                    <p>
                      {court.indoor ? "سرپوشیده" : "روباز"} ·{" "}
                      {money(court.hourly_price)} / ساعت
                    </p>
                    <p className="text-muted-foreground">{court.description}</p>
                  </div>
                  <Button asChild>
                    <Link href={`/clubs/${c.slug}/book?court=${court.id}`}>
                      مشاهده سانس‌ها
                    </Link>
                  </Button>
                </div>
              ))}
            {!d.courts.some((x) => x.club_id === c.id) && (
              <p className="text-sm text-muted-foreground">
                سانس قابل رزروی برای این باشگاه منتشر نشده است.
              </p>
            )}
          </div>
          <div className="platform-card">
            <h2>امکانات باشگاه</h2>
            <div className="flex flex-wrap gap-3">
              {c.facilities.map((f) => (
                <span key={f} className="status-pill">
                  {f}
                </span>
              ))}
            </div>
            <h2 className="mt-7">اجاره تجهیزات</h2>
            {d.equipment
              .filter((e) => e.club_id === c.id)
              .map((e) => (
                <p
                  className="my-2 flex justify-between gap-4 text-sm"
                  key={e.id}
                >
                  <span>
                    {e.name} · {e.kind === "shared" ? "مشترک" : "شخصی"}
                  </span>
                  <span>{e.price ? money(e.price) : "رایگان"}</span>
                </p>
              ))}
          </div>
        </div>
        <aside className="platform-card sticky-card">
          <h2>قبل از رفتن به زمین</h2>
          <p className="text-sm">{c.address}</p>
          {c.latitude !== null && c.longitude !== null && (
            <a
              className="my-4 block text-sm text-emerald-800 underline"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=16/${c.latitude}/${c.longitude}`}
            >
              نمایش موقعیت روی نقشه
            </a>
          )}
          <p className="mt-5 text-sm text-muted-foreground">
            {c.booking_mode === "MANUAL_APPROVAL"
              ? "این باشگاه با تأیید دستی کار می‌کند. ابتدا نگه‌داشت سانس توسط باشگاه ثبت می‌شود؛ سپس مهلت پرداخت حداکثر ۶۰ دقیقه فعال خواهد شد."
              : "رزرو خودکار فقط با اتصال معتبر باشگاه فعال می‌شود؛ پرداخت به‌تنهایی تأیید زمین نیست."}
          </p>
          <Link href="/terms" className="mt-5 block text-sm underline">
            قوانین رزرو و استرداد
          </Link>
        </aside>
      </div>
    </section>
  );
}
