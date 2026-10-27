"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { cancellationSummary, supportHref } from "@/lib/product";
import { cancellationQuote } from "@/app/product-actions";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { Button } from "@/components/ui/button";
export function CancelBooking({ booking }: { booking: string }) {
  const [quote, setQuote] = useState<{
      paid: number;
      refund: number;
      allowed: boolean;
    } | null>(null),
    [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            setQuote(null);
            const r = await cancellationQuote(booking);
            if (r.quote) setQuote(r.quote);
            else setError(r.message);
          })
        }
      >
        {pending ? "در حال محاسبهٔ شرایط لغو…" : "بررسی مبلغ و شرایط لغو"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {quote && (
        <>
          {quote.allowed && (
            <p className="text-sm leading-8">
              {cancellationSummary(quote.paid, quote.refund)}
            </p>
          )}
          {quote.allowed ? (
            <ActionForm
              operation="cancel-quoted"
              label="لغو رزرو با شرایط بالا"
              confirm={
                cancellationSummary(quote.paid, quote.refund) + " رزرو لغو شود؟"
              }
            >
              <input type="hidden" name="booking_id" value={booking} />
              <input type="hidden" name="refund" value={quote.refund} />
              <Field
                name="reason"
                label="دلیل لغو"
                required
                minLength={2}
                maxLength={500}
              />
            </ActionForm>
          ) : (
            <p>
              این رزرو به بررسی پشتیبانی نیاز دارد؛ ممکن است اعضای پرداخت‌کرده
              یا استردادِ در حال پیگیری داشته باشد.{" "}
              <Link className="underline" href={supportHref(booking)}>
                درخواست بررسی لغو یا جایگزینی
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
