"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function CalendarStatusRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [router]);
  return (
    <p className="text-xs text-muted-foreground">
      وضعیت این صفحه هر ۳۰ ثانیه تازه می‌شود. درخواست همگام‌سازی در نوبت بعدی
      زمان‌بند، معمولاً تا یک دقیقه، اجرا می‌شود.
    </p>
  );
}
