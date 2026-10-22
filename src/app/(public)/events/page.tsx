import { catalog, events } from "@/lib/platform/data";
import {
  EventCard,
  PublicEmpty,
  DataNotice,
} from "@/components/platform/cards";
import { seo } from "@/lib/seo";
export const metadata = seo(
  "امریکانو و مسابقات پدل",
  "ثبت‌نام در رویدادهای پدل؛ امریکانو هشت‌نفره و مسابقات باشگاهی با برنامه دورها، نتایج و رتبه‌بندی.",
  "/events",
);
export default async function Events() {
  const [d, ev] = await Promise.all([catalog(), events()]);
  return (
    <section className="public-container public-page">
      <p className="eyebrow">یک قدم فراتر از بازی دوستانه</p>
      <h1>رقابت تازه، تجربه تازه.</h1>
      <p className="intro mb-8">
        رویدادهای واقعی باشگاه را پیدا کن؛ امریکانو با هم‌تیمی‌های چرخشی یا
        تورنمنت با ثبت‌نام مستقل.
      </p>
      <DataNotice unavailable={ev.unavailable} />
      {ev.rows.some((e) => e.published) ? (
        <div className="discovery-grid">
          {ev.rows
            .filter((e) => e.published)
            .map((e) => (
              <EventCard
                key={e.id}
                event={e}
                club={d.clubs.find((c) => c.id === e.club_id)}
              />
            ))}
        </div>
      ) : (
        <PublicEmpty
          title="منتظر رقابت بعدی باشگاه باش."
          body="رویدادها پس از ثبت و تأیید اطلاعات توسط برگزارکننده منتشر می‌شوند."
        />
      )}
    </section>
  );
}
