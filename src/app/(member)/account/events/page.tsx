import Link from "next/link";
import { ownRows, events } from "@/lib/platform/data";
import { money, bookingLabels } from "@/lib/platform/format";
import { ActionForm } from "@/components/platform/action-form";
import { beginPayment } from "@/app/payment-actions";
import { paymentConfigured } from "@/lib/payments/zarinpal";
export default async function AccountEvents() {
  const [rows, ev] = await Promise.all([
    ownRows("event_registrations"),
    events(),
  ]);
  return (
    <section className="public-container public-page">
      <h1>رقابت‌های تو</h1>
      {rows.map((r) => {
        const e = ev.rows.find((e) => e.id === r.event_id);
        return (
          <article className="platform-card my-5" key={r.id}>
            <h2>{e?.title ?? "رویداد باشگاه"}</h2>
            <p className="text-sm">
              {bookingLabels[r.status]} ·{" "}
              {r.amount ? money(r.amount) : "رایگان"}
            </p>
            {e && (
              <Link
                href={`/events/${e.slug}`}
                className="my-4 block text-sm underline"
              >
                مشاهده رویداد
              </Link>
            )}
            {r.status === "reserved" && (
              <div className="max-w-xs">
                <ActionForm
                  action={beginPayment}
                  label="پرداخت ثبت‌نام"
                  disabled={!paymentConfigured()}
                >
                  <input type="hidden" name="registration_id" value={r.id} />
                </ActionForm>
                {!paymentConfigured() && (
                  <p className="mt-3 text-xs text-amber-800">
                    درگاه هنوز تنظیم نشده است.
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
      {!rows.length && (
        <p className="mt-7 text-sm text-muted-foreground">
          هنوز در رویدادی ثبت‌نام نکرده‌ای.
        </p>
      )}
    </section>
  );
}
