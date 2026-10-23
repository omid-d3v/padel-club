import { requestTime } from "@/lib/platform/request-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, member } from "@/lib/platform/data";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/platform/booking-form";
import { providerFor, providerConfigured } from "@/lib/booking/providers";
import { JalaliDateInput } from "@/components/ui/jalali-date-input";
import { equipmentSelection } from "@/lib/booking/selection";
import {
  isGregorianDate,
  tehranLocalToISO,
  tehranToday,
} from "@/lib/date-time";
export const metadata = {
  title: "رزرو زمین",
  robots: { index: false, follow: false },
};
export default async function Book({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    court?: string;
    date?: string;
    slot?: string;
    kind?: string;
    equipment?: string;
  }>;
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
  const selectedDay =
    q.date && isGregorianDate(q.date) ? q.date : tehranToday(new Date(now));
  const from = new Date(tehranLocalToISO(`${selectedDay}T00:00`));
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
      <nav aria-label="انتخاب زمین" className="mb-5 flex flex-wrap gap-2">
        {d.courts
          .filter((c) => c.club_id === club.id && c.active)
          .map((c) => (
            <Link
              key={c.id}
              href={`?court=${c.id}&date=${selectedDay}`}
              aria-current={c.id === court.id ? "page" : undefined}
              className={`min-h-11 rounded-xl border px-5 py-3 text-sm ${c.id === court.id ? "border-emerald-900 bg-emerald-900 font-bold text-white" : "border-border bg-white"}`}
            >
              {c.name}
            </Link>
          ))}
      </nav>
      <details className="mb-6 rounded-2xl border border-border bg-white p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-bold text-emerald-900">
          تاریخ دیگری مدنظرته؟ تقویم کامل
        </summary>
        <form className="filter-bar !mb-0 !border-0 !p-0 mt-4">
          <input type="hidden" name="court" value={court.id} />
          <label className="field">
            شروع بازه (شمسی)
            <JalaliDateInput name="date" defaultValue={selectedDay} />
          </label>
          <button className="rounded-xl bg-primary px-5 text-sm font-bold">
            نمایش سانس‌ها
          </button>
        </form>
      </details>
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
      <BookingForm
        key={`${court.id}:${selectedDay}`}
        authenticated={!!m}
        needsProfile={!!m && !m.profile}
        phoneEnabled={process.env.PHONE_AUTH_ENABLED === "true"}
        initialEquipment={equipmentSelection(
          q.equipment,
          d.equipment.filter((e) => e.club_id === club.id),
        )}
        initialKind={q.kind === "open" ? "open" : "private"}
        startDay={selectedDay}
        initialSlotId={
          shownSlots.find((s) => s.id === q.slot && s.available)?.id ?? ""
        }
        now={now}
        requestKey={crypto.randomUUID()}
        club={club}
        court={court}
        slots={shownSlots}
        providerReady={ready && !liveError}
        equipment={d.equipment.filter((e) => e.club_id === club.id)}
      />
    </section>
  );
}
