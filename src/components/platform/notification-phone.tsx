"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import {
  requestNotificationPhone,
  resendNotificationPhone,
  confirmNotificationPhone,
} from "@/app/phone-auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function NotificationPhone({
  verifiedPhone,
}: {
  verifiedPhone?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(""),
    [sent, setSent] = useState(false),
    [message, setMessage] = useState("");
  const [retryIn, setRetryIn] = useState(0);
  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = setTimeout(() => setRetryIn(retryIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryIn]);
  const [pending, start] = useTransition();
  return (
    <section className="platform-card my-5 space-y-4">
      <h2>موبایل دریافت پیامک</h2>
      <p className="text-sm leading-7">
        {verifiedPhone
          ? `شمارهٔ تأییدشده: ${verifiedPhone}. برای تغییر، شمارهٔ جدید را تأیید کنید.`
          : "شماره موبایل خود را برای ورود و دریافت تغییر ساعت، عضو جدید و قطعی‌شدن رزرو تأیید کنید."}
      </p>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          start(async () => {
            const result = sent
              ? await confirmNotificationPhone(phone, String(form.get("code")))
              : await requestNotificationPhone(phone);
            setMessage(result.message);
            if (result.success) {
              setSent(!sent);
              if (!sent) setRetryIn(60);
              if (sent) router.refresh();
            }
          });
        }}
      >
        <label className="block text-sm">
          شماره موبایل
          <Input
            className="mt-2"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            readOnly={sent}
            required
          />
        </label>
        {sent && (
          <label className="block text-sm">
            کد تأیید
            <Input
              className="mt-2"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={6}
              maxLength={10}
              required
              dir="ltr"
            />
          </label>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <Button variant="outline" disabled={pending}>
          {pending
            ? "در حال بررسی…"
            : sent
              ? "تأیید موبایل"
              : "دریافت کد تأیید شماره"}
        </Button>
        {sent && (
          <Button
            variant="outline"
            type="button"
            disabled={pending || retryIn > 0}
            onClick={() =>
              start(async () => {
                const result = await resendNotificationPhone(phone);
                setMessage(result.message);
                if (result.success) setRetryIn(60);
              })
            }
          >
            {retryIn > 0
              ? `ارسال مجدد تا ${retryIn.toLocaleString("fa-IR")} ثانیه دیگر`
              : "ارسال دوبارهٔ کد"}
          </Button>
        )}
        {sent && (
          <Button
            variant="ghost"
            type="button"
            disabled={pending}
            onClick={() => setSent(false)}
          >
            ویرایش شماره
          </Button>
        )}
      </form>
    </section>
  );
}
