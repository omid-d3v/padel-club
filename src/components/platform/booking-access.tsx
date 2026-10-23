"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/forms";
import { AuthMethods } from "./auth-methods";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { Button } from "@/components/ui/button";
import { registerAccount } from "@/app/platform-actions";

export function BookingAccess({
  phoneEnabled,
  returnTo,
}: {
  phoneEnabled: boolean;
  returnTo: string;
}) {
  const [signup, setSignup] = useState(false);
  const router = useRouter();
  const resume = () => router.refresh();
  return (
    <section className="platform-card mb-6" aria-label="ورود و ادامه رزرو">
      <h2>برای ادامه، وارد حساب شو</h2>
      <p className="mb-5 text-sm leading-7 text-muted-foreground">
        سانس و تجهیزات انتخابی‌ات همین‌جا می‌ماند؛ بعد از ورود یا ساخت حساب،
        رزرو را ادامه بده.
      </p>
      <div className="mb-5 flex gap-3" role="group" aria-label="حساب کاربری">
        <Button
          type="button"
          variant={!signup ? "default" : "outline"}
          aria-pressed={!signup}
          onClick={() => setSignup(false)}
        >
          حساب دارم
        </Button>
        <Button
          type="button"
          variant={signup ? "default" : "outline"}
          aria-pressed={signup}
          onClick={() => setSignup(true)}
        >
          ساخت حساب
        </Button>
      </div>
      <AuthMethods
        key={String(signup)}
        signup={signup}
        phoneEnabled={phoneEnabled}
        onAuthenticated={resume}
      >
        {signup ? (
          <ActionForm
            action={registerAccount}
            label="ساخت حساب و ادامه رزرو"
            onSuccess={(result) => {
              if (result.redirect) resume();
            }}
          >
            <input type="hidden" name="next" value={returnTo} />
            <Field
              name="email"
              label="ایمیل"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
            />
            <Field
              name="password"
              label="رمز عبور؛ حداقل ۱۰ کاراکتر"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
            />
            <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
              <input type="checkbox" required className="mt-1 size-5" />
              <span>
                با{" "}
                <Link href="/terms" target="_blank" className="underline">
                  قوانین
                </Link>{" "}
                و{" "}
                <Link href="/privacy" target="_blank" className="underline">
                  حریم خصوصی
                </Link>{" "}
                موافقم.
              </span>
            </label>
            <p className="text-xs leading-7 text-muted-foreground">
              اگر تأیید ایمیل لازم باشد، لینک تأیید شما را به همین رزرو
              برمی‌گرداند. انتخاب سانس تا پرداخت، تضمین ظرفیت نیست.
            </p>
          </ActionForm>
        ) : (
          <LoginForm onAuthenticated={resume} />
        )}
      </AuthMethods>
    </section>
  );
}
