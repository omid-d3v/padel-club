"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthMethods } from "./auth-methods";
import { Button } from "@/components/ui/button";

export function BookingAccess({
  phoneEnabled,
  returnTo,
  needsProfile = false,
}: {
  phoneEnabled: boolean;
  returnTo: string;
  needsProfile?: boolean;
}) {
  const [signup, setSignup] = useState(false);
  const router = useRouter();
  return (
    <section
      className="booking-access platform-card glass-surface mb-6"
      aria-label="ورود و ادامه رزرو"
    >
      <h2>
        {needsProfile ? "اطلاعات بازی‌ات را تکمیل کن" : "یک قدم تا ادامهٔ رزرو"}
      </h2>
      <p className="mb-5 text-sm leading-7 text-muted-foreground">
        سانس و تجهیزات انتخابی‌ات همین‌جا می‌ماند؛ شماره و اطلاعات بازی که تأیید
        شد، همین رزرو را ادامه می‌دهی.
      </p>
      {!needsProfile && !phoneEnabled && (
        <div className="mb-5 flex gap-3" role="group" aria-label="حساب کاربری">
          <Button
            type="button"
            variant="outline"
            aria-pressed={!signup}
            onClick={() => setSignup(false)}
          >
            حساب دارم
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-pressed={signup}
            onClick={() => setSignup(true)}
          >
            ساخت حساب
          </Button>
        </div>
      )}
      <AuthMethods
        key={String(signup)}
        signup={signup}
        unified={phoneEnabled}
        phoneEnabled={phoneEnabled}
        next={returnTo}
        initialProfileRequired={needsProfile}
        onAuthenticated={() => router.refresh()}
      />
    </section>
  );
}
