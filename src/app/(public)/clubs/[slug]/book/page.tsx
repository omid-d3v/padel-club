import { requestTime } from "@/lib/platform/request-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, member } from "@/lib/platform/data";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/platform/booking-form";
import { providerFor, providerConfigured } from "@/lib/booking/providers";
export const metadata = {
  title: "درخواست رزرو زمین",
  robots: { index: false, follow: false },
};
export default async function Book({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ court?: string; date?: string }>;
}) {
  const now = await requestTime();
  const [{ slug }, q, d, m] = await Promise.all([
    params,
    searchParams,
    catalog(),
    member(),
  ]);
  const club = d.clubs.find((c) => c.slug === slug);
  const court =
    d.courts.find((c) => c.id === q.court && c.club_id === club?.id) ??
    d.courts.find((c) => c.club_id === club?.id);
  if (!club || !court) notFound();
  const db = await createClient();
  const from =
    q.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(q.date) &&
    !Number.isNaN(Date.parse(`${q.date}T00:00:00+03:30`))
      ? new Date(`${q.date}T00:00:00+03:30`)
      : new Date();
  const to = new Date(from.getTime() + 7 * 86400000);
  const { data: slots, error } = await db.rpc("discover_slots", {
    p_court: court.id,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw new Error("دریافت سانس‌ها انجام نشد.");
  const ready =
    club.booking_mode !== "EXTERNAL_AUTOMATED" ||
    providerConfigured(club.provider_key);
  let shownSlots = slots ?? [];
  let liveError = false;
  if (club.booking_mode === "EXTERNAL_AUTOMATED") {
    shownSlots = [];
    if (ready && court.external_court_ref) {
      try {
        const live = await providerFor(club.provider_key).getAvailability(
          court.external_court_ref,
          from.toISOString(),
          to.toISOString(),
        );
        shownSlots = (slots ?? []).flatMap((s) => {
          const item = live.find(
            (x) =>
              new Date(x.startsAt).getTime() ===
                new Date(s.starts_at).getTime() &&
              new Date(x.endsAt).getTime() === new Date(s.ends_at).getTime() &&
              x.available,
          );
          return item ? [{ ...s, court_price: item.price }] : [];
        });
      } catch {
        liveError = true;
      }
    }
  }
  return (
    <section className="public-container public-page">
      <p className="eyebrow">
        {club.name} · {court.name}
      </p>
      <h1>برای بازی بعدی جا باز کن.</h1>
      <p className="intro">
        سانس‌های هفت روز پیش رو؛ تاریخ و ساعت نمایش‌داده‌شده به وقت تهران است.
      </p>
      <form className="filter-bar">
        <input type="hidden" name="court" value={court.id} />
        <label className="field">
          شروع بازه (ورودی میلادی)
          <input
            type="date"
            name="date"
            defaultValue={q.date}
            className="ms-3 min-h-12 rounded-lg border border-border px-3"
          />
        </label>
        <button className="rounded-xl bg-primary px-5 text-sm font-bold">
          نمایش سانس‌ها
        </button>
      </form>
      {liveError && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          دریافت تقویم زنده باشگاه انجام نشد؛ هیچ سانس تأییدنشده‌ای برای خرید
          نمایش داده نمی‌شود.
        </p>
      )}
      {club.booking_mode === "EXTERNAL_AUTOMATED" && (
        <p className="my-5 text-xs leading-7 text-muted-foreground">
          قیمت و موجودی دوباره بررسی می‌شود. تا دریافت مرجع رزرو خارجی، زمین
          قطعی نیست. اگر باشگاه نگه‌داشت ندارد، پرداخت اولیه مشارکت موقت است و
          در صورت ناموفق‌بودن خرید زمین، درخواست استرداد کامل ثبت می‌شود.
        </p>
      )}
      {!m ? (
        <div className="platform-card">
          <p>برای ثبت درخواست، وارد حساب شوید.</p>
          <Link
            href="/login"
            className="mt-4 inline-block text-emerald-800 underline"
          >
            ورود یا عضویت
          </Link>
        </div>
      ) : !m.profile ? (
        <div className="platform-card">
          <p>نام و سطح خود را پیش از رزرو ثبت کنید.</p>
          <Link
            href="/account/profile"
            className="mt-4 inline-block text-emerald-800 underline"
          >
            تکمیل پروفایل
          </Link>
        </div>
      ) : (
        <BookingForm
          now={now}
          requestKey={crypto.randomUUID()}
          club={club}
          court={court}
          slots={shownSlots}
          providerReady={ready && !liveError}
          equipment={d.equipment.filter((e) => e.club_id === club.id)}
        />
      )}
    </section>
  );
}
