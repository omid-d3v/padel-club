"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestPhoneCode, verifyPhoneCode } from "@/app/phone-auth-actions";
import { safeNext } from "@/lib/platform/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthMethods({
  children,
  signup = false,
  next,
  phoneEnabled = false,
}: {
  children: React.ReactNode;
  signup?: boolean;
  next?: string;
  phoneEnabled?: boolean;
}) {
  const [mode, setMode] = useState(phoneEnabled ? "phone" : "email");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-5">
      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="روش ورود"
      >
        {[
          ["phone", "شماره موبایل"],
          ["email", "ایمیل"],
        ].map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={mode === key ? "default" : "outline"}
            aria-pressed={mode === key}
            onClick={() => {
              setMode(key);
              setMessage("");
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {mode === "email" ? (
        children
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(async () => {
              const result = sent
                ? await verifyPhoneCode(phone, String(form.get("code") ?? ""))
                : await requestPhoneCode(phone, signup);
              setMessage(result.message);
              setFailed(!result.success);
              if (result.success) {
                if (sent && "redirect" in result) {
                  router.replace(
                    safeNext(
                      next,
                      typeof result.redirect === "string"
                        ? result.redirect
                        : "/account",
                    ),
                  );
                  router.refresh();
                } else {
                  setSent(true);
                  setRetryAt(Date.now() + 60000);
                }
              }
            });
          }}
        >
          <label className="block text-sm">
            شماره موبایل ایران
            <Input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              readOnly={sent}
              required
              placeholder="09123456789"
              className="mt-2"
            />
          </label>
          <p className="text-xs leading-6 text-muted-foreground">
            {sent
              ? `کد ارسال‌شده به ${phone} را وارد کنید. کد فقط یک بار قابل استفاده است.`
              : "کد یک‌بارمصرف با پیامک ارسال می‌شود؛ رمز عبور لازم نیست."}
          </p>
          {sent && (
            <label className="block text-sm">
              کد تأیید
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                minLength={6}
                maxLength={10}
                required
                autoFocus
                className="mt-2"
              />
            </label>
          )}
          {signup && !sent && (
            <label className="flex gap-3 text-xs leading-7">
              <input type="checkbox" required className="size-5" />
              با{" "}
              <Link href="/terms" className="underline">
                قوانین
              </Link>{" "}
              و{" "}
              <Link href="/privacy" className="underline">
                حریم خصوصی
              </Link>{" "}
              موافقم.
            </label>
          )}
          {message && (
            <p
              role={failed ? "alert" : "status"}
              className={
                failed ? "text-sm text-red-700" : "text-sm text-emerald-800"
              }
            >
              {message}
            </p>
          )}
          <Button disabled={pending} className="w-full">
            {pending
              ? "در حال بررسی…"
              : sent
                ? "تأیید کد و ورود"
                : "دریافت کد تأیید"}
          </Button>
          {sent && (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setSent(false);
                  setMessage("");
                }}
              >
                ویرایش شماره
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (Date.now() < retryAt) {
                    setFailed(false);
                    setMessage(
                      "برای ارسال مجدد، یک دقیقه از ارسال قبلی صبر کنید.",
                    );
                    return;
                  }
                  start(async () => {
                    const r = await requestPhoneCode(phone, signup);
                    setFailed(!r.success);
                    setMessage(r.message);
                    if (r.success) setRetryAt(Date.now() + 60000);
                  });
                }}
              >
                ارسال دوباره کد
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
