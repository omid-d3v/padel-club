import Link from "next/link";
import { ownRows, events } from "@/lib/platform/data";
import {
  money,
  moment,
  bookingLabels,
  cancellationText,
} from "@/lib/platform/format";
import {
  cancellationAmount,
  cancellationSummary,
  supportHref,
} from "@/lib/product";
import { paymentMethods } from "@/lib/payments/methods";
import { PaymentChooser } from "@/components/platform/payment-chooser";
import { Countdown } from "@/components/platform/countdown";
import { ActionForm } from "@/components/platform/action-form";
import { PublicEmpty } from "@/components/platform/cards";
import { requestTime } from "@/lib/platform/request-time";
export default async function AccountEvents() {
  const [rows, ev, payments, methods, now] = await Promise.all([
    ownRows("event_registrations"),
    events(),
    ownRows("payments"),
    paymentMethods(),
    requestTime(),
  ]);
  return (
    <section className="public-container public-page">
      <h1>رقابت‌های تو</h1>
      {rows
        .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => {
          const e = ev.rows.find((e) => e.id === r.event_id);
          const active = r.status === "paid" || r.status === "reserved";
          const canPay =
            r.status === "reserved" &&
            !!r.lock_expires_at &&
            Date.parse(r.lock_expires_at) > now;
          const paidPayments = payments.filter(
            (p) => p.registration_id === r.id && p.status === "paid",
          );
          const paid = paidPayments.reduce((s, p) => s + p.amount, 0);
          const refund = e
            ? paidPayments.reduce(
                (s, p) =>
                  s +
                  cancellationAmount(
                    p.amount,
                    e.cancellation_policy,
                    e.starts_at,
                    now,
                  ),
                0,
              )
            : 0;
          return (
            <article
              className="platform-card my-5 space-y-4"
              id={`event-${r.event_id}`}
              key={r.id}
            >
              <h2>{e?.title ?? "رویداد باشگاه"}</h2>
              <p>
                {bookingLabels[r.status] ?? r.status} ·{" "}
                {r.amount ? money(r.amount) : "رایگان"}
              </p>
              {e && (
                <>
                  <p>{moment(e.starts_at)}</p>
                  <Link
                    className="inline-flex min-h-11 items-center underline"
                    href={`/events/${e.slug}`}
                  >
                    مشاهده رویداد و بازیکنان
                  </Link>
                  <p className="text-sm leading-8">
                    {cancellationText(e.cancellation_policy)}
                  </p>
                </>
              )}
              {r.status === "reserved" && r.lock_expires_at && (
                <Countdown
                  now={now}
                  deadline={r.lock_expires_at}
                  label="زمان باقی‌مانده برای پرداخت ثبت‌نام"
                />
              )}
              {canPay && (
                <div className="max-w-sm">
                  <PaymentChooser methods={methods} registration={r.id} />
                  {!methods.card && !methods.zarinpal && (
                    <p role="status">
                      پرداخت فعلاً در دسترس نیست؛ از پشتیبانی پیگیری کنید.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-5 text-sm">
                <Link className="min-h-11 underline" href="/account/payments">
                  سوابق پرداخت و استرداد
                </Link>
                <Link
                  className="min-h-11 underline"
                  href={supportHref(undefined, undefined, r.event_id)}
                >
                  پیگیری این ثبت‌نام
                </Link>
              </div>
              {active &&
                e &&
                e.status === "registration" &&
                Date.parse(e.registration_deadline) > now && (
                  <details>
                    <summary className="min-h-11 cursor-pointer">
                      انصراف و شرایط بازگشت وجه
                    </summary>
                    <p className="my-4 text-sm leading-8">
                      {cancellationSummary(paid, refund)}
                    </p>
                    <ActionForm
                      operation="withdraw-event"
                      label="انصراف با شرایط بالا"
                      confirm={
                        cancellationSummary(paid, refund) + " انصراف ثبت شود؟"
                      }
                    >
                      <input type="hidden" name="event_id" value={e.id} />
                      <input type="hidden" name="refund" value={refund} />
                    </ActionForm>
                  </details>
                )}
            </article>
          );
        })}
      {!rows.length && (
        <PublicEmpty
          title="هنوز در رویدادی ثبت‌نام نکرده‌ای."
          body="رقابت‌های پیش‌رو را ببین و رویداد مناسب خودت را انتخاب کن."
          href="/events"
          action="دیدن رویدادها"
        />
      )}
    </section>
  );
}
