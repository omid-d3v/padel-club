import { catalog } from "@/lib/platform/data";
import { ClubCard, DataNotice, PublicEmpty } from "@/components/platform/cards";
import { seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
export const metadata = seo(
  "باشگاه‌های پدل و رزرو زمین",
  "باشگاه‌های منتشرشده پدل را بر اساس شهر و امکانات پیدا کنید و سانس مناسب را با هزینه شفاف درخواست کنید.",
  "/clubs",
);
export default async function Clubs({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const [d, q] = await Promise.all([catalog(), searchParams]);
  const clubs = d.clubs.filter(
    (c) => (!q.city || c.city_id === q.city) && (!q.q || c.name.includes(q.q)),
  );
  return (
    <section className="public-container public-page">
      <p className="eyebrow">یک زمین، کلی اتفاق خوب</p>
      <h1>باشگاه بازی بعدی‌ات کجاست؟</h1>
      <p className="intro">
        شهر، امکانات و زمان مناسب را پیدا کن؛ قیمت سانس و شرایط لغو قبل از
        پرداخت روشن است.
      </p>
      <form className="filter-bar" action="/clubs">
        <label className="sr-only" htmlFor="club-query">
          نام باشگاه
        </label>
        <input
          id="club-query"
          name="q"
          defaultValue={q.q}
          placeholder="نام باشگاه…"
          className="min-h-12 rounded-lg border border-border px-4"
        />
        <label className="sr-only" htmlFor="club-city">
          شهر
        </label>
        <select
          id="club-city"
          name="city"
          defaultValue={q.city}
          className="min-h-12 rounded-lg border border-border px-4"
        >
          <option value="">همه شهرها</option>
          {d.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit">پیدا کردن زمین</Button>
      </form>
      <DataNotice unavailable={d.unavailable} />
      {clubs.length ? (
        <div className="discovery-grid">
          {clubs.map((c) => (
            <ClubCard
              key={c.id}
              club={c}
              courts={d.courts}
              city={d.cities.find((x) => x.id === c.city_id)}
            />
          ))}
        </div>
      ) : (
        <PublicEmpty
          title="باشگاهی با این مشخصات پیدا نشد."
          body="فیلتر را عوض کنید یا پس از انتشار باشگاه‌های تازه بازگردید."
        />
      )}
    </section>
  );
}
