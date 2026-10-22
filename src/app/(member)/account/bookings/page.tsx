import Link from "next/link";
import { ownRows, requireMember } from "@/lib/platform/data";
import {
  money,
  moment,
  bookingLabels,
  cancellationText,
} from "@/lib/platform/format";
import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
import { beginPayment } from "@/app/payment-actions";
import { paymentConfigured } from "@/lib/payments/zarinpal";
import { PublicEmpty } from "@/components/platform/cards";
export default async function Bookings() {
  const now = await requestTime();
  const [m, participants] = await Promise.all([
    requireMember(),
    ownRows("booking_participants"),
  ]);
  const { data: bookings, error } = participants.length
    ? await m.db
        .from("bookings")
        .select("*")
        .in(
          "id",
          participants.map((p) => p.booking_id),
        )
    : { data: [], error: null };
  if (error) throw new Error("دریافت رزرو انجام نشد.");
  const { data: locations, error: locationError } = await m.db.rpc(
    "my_booking_locations",
  );
  if (locationError) throw new Error("دریافت اطلاعات محل بازی انجام نشد.");
  return (
    <section className="public-container public-page">
      <h1>قرارهای روی زمین</h1>
      <p className="intro">
        وضعیت تأیید باشگاه با وضعیت پرداخت فرق دارد. جزئیات هر دو را اینجا
        ببینید.
      </p>
      {!paymentConfigured() && (
        <p
          role="status"
          className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          درگاه زرین‌پال هنوز تنظیم نشده؛ رزرو و پیگیری درخواست ممکن است اما
          پرداخت پول فعال نیست.
        </p>
      )}
      {participants.length ? (
        participants
          .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
          .map((p) => {
            const b = bookings?.find((b) => b.id === p.booking_id);
            if (!b) return null;
            return (
              <article key={p.id} className="platform-card my-5">
                <div className="mb-5 flex flex-wrap justify-between gap-3">
                  <div>
                    <h2>
                      {b.kind === "private"
                        ? "درخواست خصوصی زمین"
                        : "جایگاه بازی باز"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      ثبت در {moment(b.created_at)}
                    </p>
                  </div>
                  <div>
                    <span className="status-pill">
                      {bookingLabels[b.status]}
                    </span>
                    <span className="ms-2 status-pill">
                      {bookingLabels[p.status]}
                    </span>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="price-lines">
                    <div>
                      <span>سهم زمین</span>
                      <span>{money(p.court_share)}</span>
                    </div>
                    <div>
                      <span>تجهیزات مشترک</span>
                      <span>{money(p.shared_share)}</span>
                    </div>
                    <div>
                      <span>تجهیزات شخصی</span>
                      <span>{money(p.personal_price)}</span>
                    </div>
                    <div>
                      <span>کارمزد</span>
                      <span>{money(p.fee)}</span>
                    </div>
                    <div>
                      <span>مجموع</span>
                      <span>
                        {money(
                          p.court_share +
                            p.shared_share +
                            p.personal_price +
                            p.fee,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm">
                    {locations
                      ?.filter((l) => l.booking_id === b.id)
                      .map((l) => (
                        <div key={l.booking_id}>
                          <p className="font-bold">
                            {l.club} · {l.court}
                          </p>
                          <p>{moment(l.starts_at)}</p>
                          <p className="mt-2 text-xs">{l.address}</p>
                        </div>
                      ))}
                    <p className="text-xs leading-7 text-muted-foreground">
                      {cancellationText(b.cancellation_snapshot)}
                    </p>
                    {b.hold_expires_at && (
                      <p>نگه‌داشت باشگاه تا: {moment(b.hold_expires_at)}</p>
                    )}
                    {p.lock_expires_at && (
                      <p>مهلت پرداخت شما: {moment(p.lock_expires_at)}</p>
                    )}
                    {b.status === "confirmed" && (
                      <p className="text-emerald-800">
                        زمین و پرداخت‌های لازم تأیید شده‌اند.
                      </p>
                    )}
                    {p.status === "reserved" && (
                      <ActionForm
                        action={beginPayment}
                        label="پرداخت در زرین‌پال"
                        disabled={
                          !paymentConfigured() ||
                          !p.lock_expires_at ||
                          new Date(p.lock_expires_at).getTime() <= now
                        }
                      >
                        <input
                          type="hidden"
                          name="participant_id"
                          value={p.id}
                        />
                      </ActionForm>
                    )}
                    <Link
                      href="/account/payments"
                      className="block text-xs underline"
                    >
                      پیگیری پرداخت و استرداد
                    </Link>
                  </div>
                </div>
                {b.user_id === m.userId &&
                  !["completed", "expired", "cancelled"].includes(b.status) && (
                    <details className="mt-6 border-t border-border pt-5">
                      <summary className="min-h-11 cursor-pointer text-sm">
                        لغو درخواست یا رزرو
                      </summary>
                      <ActionForm
                        operation="cancel"
                        label="درخواست لغو"
                        confirm="رزرو طبق شرایط ثبت‌شده لغو می‌شود. استرداد احتمالی جداگانه قابل پیگیری است."
                      >
                        <input type="hidden" name="booking_id" value={b.id} />
                        <Field
                          label="دلیل لغو"
                          name="reason"
                          required
                          minLength={2}
                        />
                      </ActionForm>
                    </details>
                  )}
              </article>
            );
          })
      ) : (
        <PublicEmpty
          title="هنوز قراری روی زمین نداری."
          body="از باشگاه‌ها یک سانس انتخاب کن یا به بازی باز ملحق شو."
        />
      )}
    </section>
  );
}
import { requestTime } from "@/lib/platform/request-time";
