import type { Booking, PlatformTables } from "@/lib/platform/types";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { ReschedulePicker } from "./reschedule-picker";
import { moment } from "@/lib/platform/format";

export const fulfillmentLabels: Record<string, string> = {
  review: "نیازمند بررسی مدیر",
  reserve: "آمادهٔ رزرو توسط مدیر",
  awaiting_user: "در انتظار پاسخ کاربر",
  booked: "رزرو زمین ثبت شد",
};
export function BookingFulfillment({
  booking,
  proposals,
  currentTime,
  sourceUrl,
  now,
}: {
  booking: Booking;
  proposals: PlatformTables["booking_reschedules"]["Row"][];
  currentTime: string;
  sourceUrl?: string;
  now: number;
}) {
  const proposal = proposals
    .filter((p) => p.booking_id === booking.id)
    .toSorted((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (
    booking.mode !== "MANUAL_APPROVAL" ||
    ["cancelled", "expired", "completed"].includes(booking.status)
  )
    return null;
  const waiting =
    proposal?.status === "pending" && Date.parse(proposal.expires_at) > now;
  return (
    <section className="admin-action-block space-y-4">
      <h3>پیگیری رزرو واقعی زمین</h3>
      <p className="status-pill">
        {fulfillmentLabels[booking.fulfillment_state]}
      </p>
      <p className="text-sm leading-7">
        بررسی درخواست ← تأیید زمان توسط کاربر در صورت تغییر ← رزرو در سایت زمین
        ← ثبت مرجع رزرو
      </p>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline"
        >
          بازکردن سایت رزرو زمین ↗
        </a>
      )}
      {proposal && ["pending", "accepted"].includes(proposal.status) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7">
          <p>زمان فعلی: {moment(proposal.old_starts_at)}</p>
          <p className="font-bold">
            زمان پیشنهادی: {moment(proposal.new_starts_at)}
          </p>
          <p>مبلغ تغییر نمی‌کند.</p>
          <p>
            {proposal.status === "accepted"
              ? "کاربر تأیید کرده؛ اکنون سانس جدید را در سایت زمین رزرو کنید."
              : waiting
                ? "منتظر پاسخ کاربر؛ هنوز زمان رزرو تغییر نکرده است."
                : "مهلت پاسخ تمام شده؛ یک پیشنهاد تازه ارسال کنید."}
          </p>
        </div>
      )}
      {booking.fulfillment_state === "review" && (
        <ActionForm
          operation="admin:review-booking"
          label="درخواست را بررسی کردم؛ انتقال به صف رزرو"
        >
          <input type="hidden" name="booking_id" value={booking.id} />
        </ActionForm>
      )}
      {booking.fulfillment_state === "reserve" && (
        <ActionForm
          operation="admin:fulfill-booking"
          label="زمین را رزرو کردم؛ ثبت مرجع"
          confirm="تأیید می‌کنید این سانس را واقعاً در سایت یا نزد مسئول زمین رزرو کرده‌اید؟"
        >
          <input type="hidden" name="booking_id" value={booking.id} />
          <Field
            name="reference"
            label="کد رزرو یا نام مسئول و مرجع تأیید زمین"
            required
            minLength={2}
            maxLength={200}
          />
          <Field
            name="hold_until"
            type="datetime-local"
            label="اعتبار رزرو یا نگه‌داشت زمین؛ ساعت تهران"
            required
          />
          <p className="text-xs leading-6 text-muted-foreground">
            اگر پرداخت کاربر لازم باشد، پس از ثبت این مرجع مهلت پرداخت فعال
            می‌شود. پرداخت‌های تأییدشده حفظ می‌شوند.
          </p>
        </ActionForm>
      )}
      {!waiting && (
        <ReschedulePicker bookingId={booking.id} currentTime={currentTime} />
      )}
    </section>
  );
}
