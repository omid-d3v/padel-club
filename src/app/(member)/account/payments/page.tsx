import { ownRows, requireMember } from "@/lib/platform/data";
import { money, moment, bookingLabels } from "@/lib/platform/format";
import { ActionForm } from "@/components/platform/action-form";
import { retryVerifyPayment } from "@/app/payment-actions";
import { PublicEmpty } from "@/components/platform/cards";
import Link from "next/link";
export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [payments, m, q] = await Promise.all([
    ownRows("payments"),
    requireMember(),
    searchParams,
  ]);
  const { data: refunds } = payments.length
    ? await m.db
        .from("refunds")
        .select("*")
        .in(
          "payment_id",
          payments.map((p) => p.id),
        )
    : { data: [] };
  return (
    <section className="public-container public-page">
      <h1>پول کجا ایستاده؟</h1>
      <p className="intro">
        تأیید بانکی، قطعی‌شدن رزرو و استرداد سه وضعیت مستقل‌اند.
      </p>
      {q.notice && (
        <p role="status" className="my-5 rounded-xl bg-muted p-4 text-sm">
          {q.notice === "verified"
            ? "بررسی بانکی انجام شد؛ وضعیت نهایی پرداخت و رزرو را در فهرست ببینید."
            : "تأیید پرداخت کامل نشده است. در صورت کسر وجه، دوباره پرداخت نکنید؛ استعلام یا بررسی مدیر لازم است."}
        </p>
      )}
      {payments.length ? (
        payments
          .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
          .map((p) => (
            <article key={p.id} className="platform-card my-5">
              <div className="flex flex-wrap justify-between gap-3">
                <b>{money(p.amount)}</b>
                <span className="status-pill">{bookingLabels[p.status]}</span>
              </div>
              <p className="mt-4 text-sm">{moment(p.created_at)}</p>
              {p.provider === "card_transfer" && (
                <Link
                  href={`/account/payments/${p.id}`}
                  className="mt-3 inline-flex min-h-11 items-center text-sm underline"
                >
                  رسید کارت‌به‌کارت، علت رد و نتیجهٔ بررسی
                </Link>
              )}
              <p className="mt-3 text-xs">
                شناسه پیگیری داخلی: <bdi>{p.id}</bdi>
              </p>
              {p.reference && (
                <p className="mt-3 text-xs">
                  مرجع بانکی: <bdi>{p.reference}</bdi>
                </p>
              )}
              {p.authority && p.status !== "paid" && (
                <div className="mt-4 max-w-xs">
                  <ActionForm
                    action={retryVerifyPayment}
                    label="استعلام دوباره از بانک"
                  >
                    <input type="hidden" name="payment_id" value={p.id} />
                  </ActionForm>
                </div>
              )}
              {refunds
                ?.filter((r) => r.payment_id === p.id)
                .map((r) => (
                  <div
                    className="mt-5 rounded-xl bg-muted p-4 text-sm"
                    key={r.id}
                  >
                    <b>استرداد: {bookingLabels[r.status]}</b>
                    <p className="mt-2">
                      {money(r.amount)} · {r.reason}
                    </p>
                    {r.provider_reference && (
                      <p className="mt-2">
                        مرجع انجام استرداد: <bdi>{r.provider_reference}</bdi>
                      </p>
                    )}
                  </div>
                ))}
            </article>
          ))
      ) : (
        <PublicEmpty
          title="هنوز پرداختی ثبت نشده."
          body="وقتی سفارشت آماده پرداخت باشد، درخواست بانکی از صفحه رزرو فعال می‌شود."
        />
      )}
    </section>
  );
}
