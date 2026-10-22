import { requestTime } from "@/lib/platform/request-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, events, member } from "@/lib/platform/data";
import { createClient } from "@/lib/supabase/server";
import { seo, jsonLd, siteUrl } from "@/lib/seo";
import { money, moment, bookingLabels } from "@/lib/platform/format";
import { number } from "@/lib/utils";
import { ActionForm } from "@/components/platform/action-form";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ev = await events();
  const e = ev.rows.find((e) => e.slug === slug && e.published);
  return e
    ? seo(
        e.title,
        `${e.kind === "americano" ? "رویداد امریکانو" : "مسابقات پدل"}؛ ${moment(e.starts_at)}. ${e.description.slice(0, 100)}`,
        `/events/${e.slug}`,
      )
    : { title: "رویداد پیدا نشد", robots: { index: false } };
}
export default async function Event({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const now = await requestTime();
  const { slug } = await params;
  const [ev, d, m] = await Promise.all([events(), catalog(), member()]);
  const e = ev.rows.find((e) => e.slug === slug && e.published);
  if (!e) notFound();
  const club = d.clubs.find((c) => c.id === e.club_id);
  const db = await createClient();
  const { data: roster, error } = await db.rpc("event_roster", {
    p_event: e.id,
  });
  if (error) throw new Error("دریافت شرکت‌کنندگان انجام نشد.");
  const { data: placements, error: placementError } = await db.rpc(
    "event_result_table",
    { p_event: e.id },
  );
  if (placementError) throw new Error("دریافت نتایج انجام نشد.");
  const closed =
    e.status !== "registration" ||
    new Date(e.registration_deadline).getTime() <= now;
  return (
    <section className="public-container public-page">
      {club && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "SportsEvent",
              name: e.title,
              startDate: e.starts_at,
              description: e.description,
              eventStatus: `https://schema.org/${e.status === "cancelled" ? "EventCancelled" : "EventScheduled"}`,
              eventAttendanceMode:
                "https://schema.org/OfflineEventAttendanceMode",
              url: `${siteUrl()}/events/${e.slug}`,
              location: {
                "@type": "Place",
                name: club.name,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: club.address,
                  addressCountry: "IR",
                  addressLocality: d.cities.find((c) => c.id === club.city_id)
                    ?.name,
                },
              },
              organizer: {
                "@type": "Organization",
                name: "پدل کلاب",
                url: siteUrl(),
              },
            }),
          }}
        />
      )}
      <span className="status-pill">{bookingLabels[e.status]}</span>
      <h1 className="mt-5">{e.title}</h1>
      <p className="intro">{e.description}</p>
      <div className="content-grid">
        <div className="space-y-6">
          <div className="platform-card">
            <h2>زمان و جای رقابت</h2>
            <p>{club?.name}</p>
            <p>{moment(e.starts_at)}</p>
            <p className="mt-4 text-sm">
              مهلت ثبت‌نام: {moment(e.registration_deadline)}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {e.kind === "americano"
                ? "هشت بازیکن، دو زمین، هفت دور؛ هر بازیکن یک بار با همه هم‌تیمی می‌شود. امتیازدهی بر پایه برد بازی و برد راند فعلی باشگاه است."
                : "تورنمنت با ثبت‌نام فردی؛ این نسخه ثبت‌نام، ظرفیت و نتیجه اولیه را پشتیبانی می‌کند."}
            </p>
          </div>
          <div className="platform-card">
            <h2>بازیکنان ثبت‌نام‌شده</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {number(roster?.length ?? 0)} از {number(e.capacity)} جایگاه
            </p>
            {roster?.map((r, i) => (
              <p
                key={`${r.name}-${i}`}
                className="flex justify-between gap-4 border-t border-border py-3 text-sm"
              >
                <span>{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.paid ? "ثبت‌نام قطعی" : "جایگاه موقت"}
                </span>
              </p>
            ))}
            {!roster?.length && (
              <p className="text-sm text-muted-foreground">
                اولین بازیکن این رقابت باش.
              </p>
            )}
          </div>
          {e.tournament_id && (
            <Link
              className="platform-card block font-bold text-emerald-800"
              href={
                e.status === "completed"
                  ? `/tournaments/${e.tournament_id}/results`
                  : `/events/${e.slug}/rounds`
              }
            >
              مشاهده دورها، نتایج و رتبه‌بندی ↖
            </Link>
          )}
          {!!placements?.length && (
            <div className="platform-card">
              <h2>نتایج رقابت</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="py-3 text-start">رتبه</th>
                    <th className="text-start">بازیکن</th>
                    <th className="text-start">امتیاز</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.rank} className="border-t border-border">
                      <td className="py-3">{number(p.rank)}</td>
                      <td>{p.name}</td>
                      <td>{number(p.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <aside className="platform-card sticky-card">
          <h2>ثبت‌نام فردی</h2>
          <p className="text-2xl font-extrabold">
            {e.entry_fee ? money(e.entry_fee) : "رایگان"}
          </p>
          <p className="my-5 text-xs leading-7 text-muted-foreground">
            جایگاه پرداختی تا ۱۰ دقیقه نگه داشته می‌شود. پرداخت و شرایط لغو در
            سابقه حساب شما ثبت خواهد شد.
          </p>
          {m ? (
            <ActionForm
              operation="register-event"
              label="ثبت‌نام در رویداد"
              disabled={closed || (roster?.length ?? 0) >= e.capacity}
            >
              <input type="hidden" name="event_id" value={e.id} />
              <label className="flex gap-3 text-xs leading-7">
                <input type="checkbox" required className="mt-1 size-5" />
                شرایط لغو رویداد و مهلت پرداخت را می‌پذیرم.
              </label>
            </ActionForm>
          ) : (
            <Link href="/login" className="text-emerald-800 underline">
              ورود برای ثبت‌نام
            </Link>
          )}
          {m && (m.admin || m.userId === e.organizer_id) && (
            <Link className="mt-5 block text-sm underline" href="/admin/events">
              مدیریت رویداد
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
