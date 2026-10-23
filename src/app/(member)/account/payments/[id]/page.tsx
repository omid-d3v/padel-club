import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/platform/data";
import { ActionForm } from "@/components/platform/action-form";
import { submitTransferReceipt } from "@/app/transfer-actions";
import { money, moment } from "@/lib/platform/format";
import { BookingProgress } from "@/components/platform/booking-progress";
import { requestTime } from "@/lib/platform/request-time";
export default async function TransferPayment({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const now = await requestTime();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const m = await requireMember();
  const [{ data: p, error }, { data: r, error: receiptError }] =
    await Promise.all([
      m.db
        .from("payments")
        .select("*")
        .eq("id", id)
        .eq("user_id", m.userId)
        .maybeSingle(),
      m.db
        .from("card_transfer_receipts")
        .select("*")
        .eq("payment_id", id)
        .maybeSingle(),
    ]);
  if (error || receiptError)
    throw new Error("دریافت اطلاعات پرداخت انجام نشد.");
  if (!p || !r) notFound();
  const expired = Date.parse(p.expires_at) <= now,
    canUpload =
      ["draft", "rejected"].includes(r.status) &&
      Date.parse(p.created_at) > now - 7 * 86400000;
  return (
    <section className="public-container public-page !max-w-2xl">
      <h1>پرداخت کارت‌به‌کارت</h1>
      <BookingProgress step={4} />
      <div className="platform-card space-y-5">
        <h2>
          {r.status === "pending"
            ? "رسید در انتظار بررسی است"
            : r.status === "approved"
              ? "واریز بررسی و تأیید شد"
              : r.status === "rejected"
                ? "رسید نیازمند اصلاح است"
                : "اطلاعات واریز"}
        </h2>
        <p className="text-sm leading-7">
          مبلغ این سفارش: <strong>{money(p.amount)}</strong>
        </p>
        {r.status === "draft" && !expired && (
          <>
            <p className="text-sm leading-7">
              مبلغ دقیق بالا را به کارت زیر واریز کن، سپس عکس رسید را ثبت کن.
              رمز کارت، CVV2 یا رمز پویا از شما درخواست نمی‌شود.
            </p>
            <dl className="space-y-3 rounded-xl bg-muted p-4">
              <div>
                <dt className="text-xs">شماره کارت مقصد</dt>
                <dd
                  dir="ltr"
                  className="mt-2 text-start font-mono text-xl tracking-wider select-all"
                >
                  {r.card_number.match(/.{1,4}/g)?.join(" ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs">به نام</dt>
                <dd className="mt-2 font-bold">{r.card_holder}</dd>
              </div>
            </dl>
            <p className="text-xs leading-7">
              مهلت ثبت واریز برای حفظ سانس: {moment(p.expires_at)}. ثبت رسید به
              معنی تأیید پرداخت یا قطعی‌شدن زمین نیست.
            </p>
          </>
        )}
        {r.status === "pending" && (
          <p
            role="status"
            className="rounded-xl bg-amber-50 p-4 text-sm leading-7"
          >
            رسید دریافت شد. دوباره واریز نکن؛ نتیجهٔ بررسی پرداخت و سپس تأیید
            نهایی رزرو اطلاع‌رسانی می‌شود.
          </p>
        )}
        {r.status === "rejected" && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm leading-7"
          >
            <b>علت رد: </b>
            {r.rejection_reason}
            <p>
              اگر وجه از حسابت کسر شده، دوباره واریز نکن؛ فقط عکس واضح و صحیح
              همان تراکنش را ثبت کن یا با پشتیبانی تماس بگیر.
            </p>
          </div>
        )}
        {r.status === "approved" && (
          <p role="status" className="text-sm leading-7">
            {p.status === "paid"
              ? "واریز تأیید شد. وضعیت قطعی‌شدن رزرو را در «رزرو و بازی‌ها» ببین."
              : "واریز بررسی شد، اما رزرو معتبر نبود؛ وضعیت درخواست استرداد را در پرداخت‌ها دنبال کن."}
          </p>
        )}
        {expired && canUpload && (
          <p className="text-sm leading-7 text-amber-900">
            مهلت این سفارش تمام شده؛ مبلغ تازه واریز نکن. اگر قبلاً واریز
            کرده‌ای، رسید را برای بررسی و استرداد احتمالی ثبت کن. ارسال رسید،
            رزرو منقضی را فعال نمی‌کند.
          </p>
        )}
        {r.receipt_path && (
          <a
            href={`/api/payment-receipts/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm underline"
          >
            دیدن عکس رسید ثبت‌شده
          </a>
        )}
        {canUpload && (
          <ActionForm
            action={submitTransferReceipt}
            label={
              r.status === "rejected"
                ? "ثبت رسید اصلاح‌شده"
                : "واریز کردم؛ ثبت عکس رسید"
            }
            buttonVariant="default"
          >
            <input type="hidden" name="payment_id" value={p.id} />
            <label className="field">
              عکس رسید واریز
              <input
                type="file"
                name="receipt"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <p className="text-xs leading-7 text-muted-foreground">
              JPG، PNG یا WebP، حداکثر ۵ مگابایت. بخش مبلغ، زمان و شناسهٔ تراکنش
              خوانا باشد؛ اطلاعات غیرضروری حساب را در عکس بپوشان.
            </p>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
              <input type="checkbox" required className="mt-1 size-5" />
              تأیید می‌کنم این رسید مربوط به واریز واقعی همین سفارش است.
            </label>
          </ActionForm>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-5 text-sm">
        <Link href="/account/bookings" className="min-h-11 underline">
          پیگیری رزرو و بازی‌ها
        </Link>
        <Link href="/account/payments" className="min-h-11 underline">
          سوابق پرداخت و استرداد
        </Link>
      </div>
    </section>
  );
}
