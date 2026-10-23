import { ActionForm } from "./action-form";
import { moment, time } from "@/lib/platform/format";
import type { PlatformTables } from "@/lib/platform/types";

export function ReplacementNotice({
  proposal,
  canReply,
  now,
  bookingActive,
}: {
  proposal: PlatformTables["booking_reschedules"]["Row"];
  canReply: boolean;
  now: number;
  bookingActive: boolean;
}) {
  const pending = proposal.status === "pending",
    expired = Date.parse(proposal.expires_at) <= now;
  return (
    <section
      className="my-5 space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5"
      aria-label="تغییر زمان رزرو"
    >
      <h3 className="font-bold">
        {proposal.status === "completed"
          ? "زمان رزرو تغییر کرد"
          : proposal.status === "accepted"
            ? "زمان پیشنهادی را تأیید کردید؛ منتظر رزرو مدیر"
            : pending
              ? "مدیر یک زمان جایگزین پیشنهاد داده است"
              : "پیشنهاد زمان جایگزین"}
      </h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt>زمان فعلی / قبلی</dt>
          <dd>
            {moment(proposal.old_starts_at)} تا {time(proposal.old_ends_at)}
          </dd>
        </div>
        <div className="font-bold">
          <dt>زمان پیشنهادی</dt>
          <dd>
            {moment(proposal.new_starts_at)} تا {time(proposal.new_ends_at)}
          </dd>
        </div>
      </dl>
      <p className="text-sm leading-7">
        مبلغ رزرو تغییر نمی‌کند. {proposal.note}
      </p>
      {pending ? (
        <>
          <p className="text-sm leading-7">
            {!bookingActive
              ? "این رزرو لغو شده یا مهلت آن تمام شده است؛ پیشنهاد قابل پذیرش نیست."
              : expired
                ? "مهلت این پیشنهاد تمام شده؛ برای پیشنهاد جدید با مدیر هماهنگ کنید."
                : `مهلت پاسخ: ${moment(proposal.expires_at)}. پذیرش شما به معنی رزرو قطعی زمین نیست؛ مدیر باید سانس جدید را رزرو و تأیید کند.`}
          </p>
          {!expired &&
            bookingActive &&
            (canReply ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ActionForm
                  operation="reply-slot"
                  label="این تاریخ و ساعت را تأیید می‌کنم"
                  confirm={`تغییر به ${moment(proposal.new_starts_at)} با همان مبلغ را می‌پذیرید؟ پس از تأیید، مدیر رزرو زمین را انجام می‌دهد.`}
                >
                  <input type="hidden" name="proposal_id" value={proposal.id} />
                  <input type="hidden" name="decision" value="accept" />
                </ActionForm>
                <ActionForm
                  operation="reply-slot"
                  label="این زمان برایم مناسب نیست"
                  buttonVariant="outline"
                >
                  <input type="hidden" name="proposal_id" value={proposal.id} />
                  <input type="hidden" name="decision" value="reject" />
                </ActionForm>
              </div>
            ) : (
              <p className="text-sm">
                پاسخ به پیشنهاد با ثبت‌کنندهٔ اصلی رزرو است؛ نتیجه به اعضای بازی
                اطلاع داده می‌شود.
              </p>
            ))}
        </>
      ) : proposal.status === "accepted" ? (
        <p className="text-sm">
          درخواست به صف رزرو مدیر برگشته است. پس از ثبت رزرو واقعی زمین، اعلان
          دریافت می‌کنید.
        </p>
      ) : proposal.status === "rejected" ? (
        <p className="text-sm">
          پیشنهاد رد شد؛ مدیر باید دوباره درخواست را بررسی کند.
        </p>
      ) : null}
    </section>
  );
}
