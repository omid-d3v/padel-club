import type { PlatformTables } from "@/lib/platform/types";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { reviewTransferReceipt } from "@/app/transfer-actions";
export function ReceiptReview({
  receipt: r,
}: {
  receipt: PlatformTables["card_transfer_receipts"]["Row"];
}) {
  return (
    <section className="space-y-5">
      <p className="text-sm leading-7">
        کارت مقصد این پرداخت: <bdi>{r.card_number}</bdi> · {r.card_holder}
      </p>
      {r.receipt_path && (
        <figure className="rounded-2xl border border-border bg-muted p-3">
          <a
            href={`/api/payment-receipts/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm underline"
          >
            {/* Session-checked endpoint; no public receipt URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/payment-receipts/${r.id}`}
              alt="رسید واریز ارسال‌شده توسط کاربر"
              className="mb-3 max-h-80 w-full rounded-xl object-contain"
              loading="lazy"
            />
            بازکردن عکس رسید خصوصی
          </a>
        </figure>
      )}
      {r.rejection_reason && (
        <p className="text-sm text-red-700">علت رد: {r.rejection_reason}</p>
      )}
      {r.bank_reference && (
        <p className="text-sm">
          شناسهٔ تراکنش تطبیق‌یافته: <bdi>{r.bank_reference}</bdi>
        </p>
      )}
      {r.status === "pending" && (
        <>
          <p className="rounded-xl bg-amber-50 p-4 text-sm leading-7">
            پیش از تأیید، مبلغ، کارت مقصد و شناسهٔ تراکنش را با گردش واقعی حساب
            تطبیق دهید؛ عکس رسید به‌تنهایی اثبات واریز نیست. تأیید واریز
            دیرهنگام، رزرو منقضی را فعال نمی‌کند و درخواست استرداد می‌سازد.
          </p>
          <ActionForm
            action={reviewTransferReceipt}
            label="تأیید واریز پس از تطبیق حساب"
            buttonVariant="default"
            confirm="واریز را در گردش حساب تطبیق داده‌اید و شناسهٔ واقعی تراکنش صحیح است؟"
          >
            <input type="hidden" name="receipt_id" value={r.id} />
            <input type="hidden" name="revision" value={r.revision} />
            <input type="hidden" name="decision" value="accept" />
            <Field
              name="bank_reference"
              label="شناسهٔ واقعی تراکنش در گردش حساب"
              minLength={3}
              maxLength={100}
              required
            />
          </ActionForm>
          <details className="border-t border-border pt-4">
            <summary className="min-h-11 cursor-pointer text-sm text-red-700">
              رد رسید با ذکر علت
            </summary>
            <ActionForm
              action={reviewTransferReceipt}
              label="رد رسید و اطلاع به کاربر"
              buttonVariant="destructive"
              confirm="رسید رد می‌شود و علت برای کاربر ارسال خواهد شد؛ مطمئن هستید؟"
            >
              <input type="hidden" name="receipt_id" value={r.id} />
              <input type="hidden" name="revision" value={r.revision} />
              <input type="hidden" name="decision" value="reject" />
              <Field
                name="reason"
                label="علت رد رسید"
                required
                minLength={3}
                maxLength={500}
              />
            </ActionForm>
          </details>
        </>
      )}
    </section>
  );
}
