import { matches, catalog } from "@/lib/platform/data";
import { SKILLS } from "@/lib/platform/types";
import {
  MatchCardPublic,
  PublicEmpty,
  DataNotice,
} from "@/components/platform/cards";
import { seo } from "@/lib/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export const metadata = seo(
  "هم‌بازی پدل و بازی‌های باز",
  "بازی پدل با بازیکنان هم‌سطح پیدا کنید؛ ظرفیت چهار نفره، سهم مشخص هر بازیکن و تأیید واقعی باشگاه.",
  "/matches",
);
export default async function Matches({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    skill?: string;
    city?: string;
    date?: string;
  }>;
}) {
  const q = await searchParams;
  const page = Math.max(1, Math.min(1000, Math.floor(Number(q.page) || 1)));
  const d = await catalog();
  const skill =
    q.skill && /^[0-5]$/.test(q.skill) ? Number(q.skill) : undefined;
  const city = d.cities.some((c) => c.id === q.city) ? q.city : undefined;
  const date =
    q.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(q.date) &&
    !Number.isNaN(Date.parse(q.date))
      ? q.date
      : undefined;
  const games = await matches(undefined, (page - 1) * 24, {
    skill,
    city,
    date,
  });
  const pageHref = (p: number) =>
    "/matches?" +
    new URLSearchParams({
      page: String(p),
      ...(skill !== undefined ? { skill: String(skill) } : {}),
      ...(city ? { city } : {}),
      ...(date ? { date } : {}),
    }).toString();
  return (
    <section className="public-container public-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">هم‌بازی، نزدیک به سطح تو</p>
          <h1>بازی خوب، با آدم‌های خوب.</h1>
        </div>
        <Button asChild>
          <Link href="/clubs">ساخت بازی تازه</Link>
        </Button>
      </div>
      <p className="intro mb-8">
        هر بازی چهار نفر دارد. سهم خودت را می‌پردازی و برای تکمیل ظرفیت تا چهار
        ساعت پیش از شروع فرصت هست.
      </p>
      <DataNotice unavailable={games.unavailable} />
      <form className="filter-bar mb-8">
        <label className="field">
          شهر
          <select name="city" defaultValue={city ?? ""}>
            <option value="">همه شهرها</option>
            {d.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          سطح من
          <select name="skill" defaultValue={skill ?? ""}>
            <option value="">همه سطح‌ها</option>
            {SKILLS.map((s, i) => (
              <option key={s} value={i}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          روز بازی؛ ورودی میلادی
          <input type="date" name="date" defaultValue={date} />
        </label>
        <button className="rounded-xl bg-primary px-5 py-3 font-bold">
          جست‌وجوی بازی
        </button>
      </form>
      {games.rows.length ? (
        <div className="discovery-grid">
          {games.rows.map((m) => (
            <MatchCardPublic key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <PublicEmpty
          title="هنوز بازیِ باز منتشر نشده."
          body="یک باشگاه و سانس انتخاب کن و بازی خودت را بساز؛ نفرهای بعدی از همین صفحه به تو می‌پیوندند."
        />
      )}
      <div className="mt-8 flex gap-4">
        {page > 1 && <Link href={pageHref(page - 1)}>صفحه قبل</Link>}
        {games.rows.length === 24 && (
          <Link href={pageHref(page + 1)}>صفحه بعد</Link>
        )}
      </div>
    </section>
  );
}
