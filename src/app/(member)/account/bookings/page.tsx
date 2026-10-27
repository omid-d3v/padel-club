import { CancelBooking } from "@/components/platform/cancel-booking";
import { InviteButton } from "@/components/platform/invite-button";
import { supportHref } from "@/lib/product";
import Link from "next/link";
import { Countdown } from "@/components/platform/countdown";
import { ownRows, requireMember } from "@/lib/platform/data";
import {
  money,
  moment,
  bookingLabels,
  cancellationText,
} from "@/lib/platform/format";
import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
import { paymentMethods } from "@/lib/payments/methods";
import { PaymentChooser } from "@/components/platform/payment-chooser";
import { PublicEmpty } from "@/components/platform/cards";
import { ReplacementNotice } from "@/components/platform/replacement-notice";
export default async function Bookings() {
  const now = await requestTime();
  const benefits = await ownRows("booking_benefits");
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
  const [methods, { data: games }, ownPayments] = await Promise.all([
    paymentMethods(),
    m.db
      .from("open_matches")
      .select("*")
      .in(
        "booking_id",
        participants.map((p) => p.booking_id),
      ),
    ownRows("payments"),
  ]);
  const { data: proposals, error: proposalError } = await m.db
    .from("booking_reschedules")
    .select("*")
    .order("created_at", { ascending: false });
  if (proposalError) throw new Error("دریافت پیشنهادهای تغییر زمان انجام نشد.");
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
      {!methods.card && !methods.zarinpal && (
        <p
          role="status"
          className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          روش پرداخت فعالی نداریم؛ وضعیت تنظیمات پرداخت باید بررسی شود.
        </p>
      )}
      {participants.length ? (
        participants
          .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
          .map((p) => {
            const b = bookings?.find((b) => b.id === p.booking_id);
            if (!b) return null;
            const location = locations?.find((l) => l.booking_id === b.id);
            const game = games?.find((g) => g.booking_id === b.id);
            return (
              <article
                id={`booking-${b.id}`}
                key={p.id}
                className="platform-card my-5"
              >
                {proposals?.find(
                  (proposal) => proposal.booking_id === b.id,
                ) && (
                  <ReplacementNotice
                    proposal={proposals.find(
                      (proposal) => proposal.booking_id === b.id,
                    )!}
                    canReply={b.user_id === m.userId}
                    bookingActive={
                      !["cancelled", "expired", "completed"].includes(b.status)
                    }
                    now={now}
                  />
                )}
                <div className="mb-5 flex flex-wrap justify-between gap-3">
                  <div>
                    <h2>
                      {game?.title ??
                        (b.kind === "private" ? "رزرو خصوصی زمین" : "بازی باز")}
                      {location && (
                        <span className="mt-3 block text-base">
                          {location.club} · {location.court} ·{" "}
                          {moment(location.starts_at)}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      ثبت در {moment(b.created_at)}
                    </p>
                  </div>
                  <div>
                    <span className="status-pill">
                      {b.fulfillment_state === "awaiting_user"
                        ? "در انتظار پاسخ به پیشنهاد زمان"
                        : b.fulfillment_state === "reserve" &&
                            b.status === "needs_attention"
                          ? "زمان پذیرفته شد؛ در انتظار تأیید نهایی"
                          : b.payment_first &&
                              b.status === "booking_in_progress"
                            ? "پرداخت موفق؛ در انتظار تأیید نهایی"
                            : bookingLabels[b.status]}
                    </span>
                    <span className="ms-2 status-pill">
                      {p.status === "paid" &&
                      p.court_share +
                        p.shared_share +
                        p.personal_price +
                        p.fee ===
                        0
                        ? "تسویه بدون پرداخت"
                        : bookingLabels[p.status]}
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
                    {(b.status === "pending_club" ||
                      b.status === "booking_in_progress") && (
                      <Countdown
                        now={now}
                        deadline={b.request_expires_at}
                        label="زمان باقی‌مانده برای پاسخ باشگاه"
                      />
                    )}
                    {p.status === "reserved" && p.lock_expires_at && (
                      <Countdown
                        now={now}
                        deadline={new Date(
                          Math.min(
                            Date.parse(p.lock_expires_at),
                            b.hold_expires_at
                              ? Date.parse(b.hold_expires_at)
                              : Infinity,
                          ),
                        ).toISOString()}
                        label="زمان باقی‌مانده برای تکمیل پرداخت"
                      />
                    )}
                    {benefits
                      .filter((x) => x.participant_id === p.id)
                      .map((x) => (
                        <p
                          key={x.id}
                          className="rounded-xl bg-emerald-50 p-3 text-emerald-900"
                        >
                          تخفیف / معافیت: {money(x.discount)} · {x.reason}
                        </p>
                      ))}
                    {p.status === "reserved" &&
                      !benefits.some((x) => x.participant_id === p.id) &&
                      !ownPayments.some(
                        (payment) =>
                          payment.participant_id === p.id &&
                          ["pending", "paid", "needs_attention"].includes(
                            payment.status,
                          ),
                      ) && (
                        <ActionForm operation="discount" label="اعمال کد تخفیف">
                          <input
                            type="hidden"
                            name="participant_id"
                            value={p.id}
                          />
                          <Field
                            name="code"
                            label="کد تخفیف"
                            required
                            minLength={3}
                          />
                        </ActionForm>
                      )}
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
                      {b.payment_first && b.fulfillment_state !== "booked"
                        ? "تا پیش از تأیید نهایی، لغو رزرو با درخواست استرداد کامل وجه همراه است."
                        : cancellationText(b.cancellation_snapshot)}
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
                      <PaymentChooser
                        methods={methods}
                        participant={p.id}
                        disabled={
                          !p.lock_expires_at ||
                          Date.parse(p.lock_expires_at) <= now
                        }
                      />
                    )}
                    {game && (
                      <>
                        <Link
                          className="block min-h-11 underline"
                          href={`/matches/${game.id}`}
                        >
                          مشاهده اعضا و ظرفیت بازی
                        </Link>
                        <InviteButton
                          title={game.title}
                          href={`/matches/${game.id}`}
                        />
                      </>
                    )}
                    <Link
                      className="block min-h-11 underline"
                      href={supportHref(b.id)}
                    >
                      درخواست پیگیری این رزرو
                    </Link>
                    <Link
                      href="/account/payments"
                      className="block text-xs underline"
                    >
                      پیگیری پرداخت و استرداد
                    </Link>
                  </div>
                </div>
                {b.user_id !== m.userId &&
                  !["completed", "expired", "cancelled"].includes(b.status) &&
                  !["withdrawn", "expired", "refunded"].includes(p.status) && (
                    <div className="mt-5">
                      {game &&
                      Date.parse(game.cutoff_at) > now &&
                      b.status !== "confirmed" ? (
                        <ActionForm
                          operation="withdraw"
                          label="انصراف از این بازی"
                          confirm={`جایگاه شما آزاد می‌شود. مبلغ ${money(ownPayments.filter((payment) => payment.participant_id === p.id && payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0))} از پرداخت‌های معتبر برای بازگشت وجه ثبت می‌شود؛ انجام انتقال از بخش پرداخت‌ها قابل پیگیری است. انصراف ثبت شود؟`}
                        >
                          <input
                            type="hidden"
                            name="match_id"
                            value={game?.id ?? ""}
                          />
                        </ActionForm>
                      ) : (
                        <Link className="underline" href={supportHref(b.id)}>
                          درخواست انصراف یا جایگزینی بازیکن
                        </Link>
                      )}
                    </div>
                  )}
                {b.user_id === m.userId &&
                  !["completed", "expired", "cancelled"].includes(b.status) && (
                    <details className="mt-6 border-t border-border pt-5">
                      <summary className="min-h-11 cursor-pointer text-sm">
                        لغو درخواست یا رزرو
                      </summary>
                      <CancelBooking booking={b.id} />
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
