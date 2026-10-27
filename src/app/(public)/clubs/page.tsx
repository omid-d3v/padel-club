import { catalog } from "@/lib/platform/data";
import { ClubCard, DataNotice, PublicEmpty } from "@/components/platform/cards";
import { seo } from "@/lib/seo";
import Link from "next/link";
import { normalizeSearch, SPORT_NAMES } from "@/lib/product";
import { Button } from "@/components/ui/button";
export const metadata = seo(
  "باشگاه‌های پدل و رزرو زمین",
  "باشگاه‌های منتشرشده پدل را بر اساس شهر و امکانات پیدا کنید و سانس مناسب را با هزینه شفاف درخواست کنید.",
  "/clubs",
);
export default async function Clubs({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    q?: string;
    kind?: string;
    sport?: string;
  }>;
}) {
  const [d, q] = await Promise.all([catalog(), searchParams]);
  const sport = q.sport && SPORT_NAMES[q.sport] ? q.sport : "padel";
  const clubs = d.clubs.filter(
    (c) =>
      (!q.city || c.city_id === q.city) &&
      (!q.q || normalizeSearch(c.name).includes(normalizeSearch(q.q))) &&
      d.courts.some((t) => t.club_id === c.id && t.sport === sport),
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
        {q.kind === "open" && <input type="hidden" name="kind" value="open" />}
        <label className="field">
          ورزش
          <select name="sport" defaultValue={sport}>
            {Object.entries(SPORT_NAMES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
      <div className="mb-5 flex flex-wrap justify-between gap-3 text-sm">
        <span>{clubs.length.toLocaleString("fa-IR")} باشگاه برای این ورزش</span>
        {(q.q || q.city) && (
          <Link
            className="underline"
            href={`/clubs?${new URLSearchParams({ sport, ...(q.kind === "open" ? { kind: "open" } : {}) })}`}
          >
            پاک‌کردن جست‌وجو و فیلتر شهر
          </Link>
        )}
      </div>
      {clubs.length ? (
        <div className="discovery-grid">
          {clubs.map((c) => (
            <ClubCard
              key={c.id}
              sport={sport}
              kind={q.kind}
              club={c}
              courts={d.courts}
              city={d.cities.find((x) => x.id === c.city_id)}
            />
          ))}
        </div>
      ) : d.unavailable ? null : (
        <PublicEmpty
          title="باشگاهی با این مشخصات پیدا نشد."
          body="نام، شهر یا ورزش دیگری انتخاب کنید."
          href={`/clubs${q.kind === "open" ? "?kind=open" : ""}`}
          action="پاک‌کردن فیلترها"
        />
      )}
    </section>
  );
}
