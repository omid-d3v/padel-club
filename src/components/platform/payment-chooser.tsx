"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { beginPayment } from "@/app/payment-actions";
export type PaymentMethods = { card: boolean; zarinpal: boolean };
export function PaymentMethodFields({
  methods,
  value,
  onChange,
}: {
  methods: PaymentMethods;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-bold">روش پرداخت</legend>
      {[
        [
          "card_transfer",
          "کارت‌به‌کارت",
          "ارسال عکس رسید و بررسی پرداخت",
          methods.card,
        ],
        [
          "zarinpal",
          "زرین‌پال",
          "پرداخت آنلاین در درگاه بانکی",
          methods.zarinpal,
        ],
      ]
        .filter(([, , , enabled]) => enabled)
        .map(([key, title, description]) => (
          <label
            key={String(key)}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${value === key ? "border-emerald-800 bg-emerald-50" : "border-border"}`}
          >
            <input
              type="radio"
              name="method"
              value={String(key)}
              checked={value === key}
              onChange={() => onChange(String(key))}
              required
            />
            <span>
              <b className="block text-sm">{title}</b>
              <small className="text-muted-foreground">{description}</small>
            </span>
          </label>
        ))}
      {!methods.card && !methods.zarinpal && (
        <p role="status" className="text-sm leading-7">
          در حال حاضر روش پرداخت فعالی نداریم. لطفاً کمی بعد مراجعه کنید.
        </p>
      )}
    </fieldset>
  );
}
export function PaymentChooser({
  methods,
  participant,
  registration,
  disabled = false,
}: {
  methods: PaymentMethods;
  participant?: string;
  registration?: string;
  disabled?: boolean;
}) {
  const [choice, setChoice] = useState("");
  const value = choice || (methods.card ? "card_transfer" : "zarinpal");
  return (
    <ActionForm
      action={beginPayment}
      label="ادامهٔ پرداخت"
      disabled={disabled || (!methods.card && !methods.zarinpal)}
    >
      {participant && (
        <input type="hidden" name="participant_id" value={participant} />
      )}
      {registration && (
        <input type="hidden" name="registration_id" value={registration} />
      )}
      <PaymentMethodFields
        methods={methods}
        value={value}
        onChange={setChoice}
      />
      <p className="text-xs leading-6 text-muted-foreground">
        اگر قبلاً واریز یا رسید ثبت کرده‌اید، دوباره پرداخت نکنید؛ ابتدا وضعیت
        همان پرداخت را بررسی کنید.
      </p>
    </ActionForm>
  );
}
