"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold">دریافت اطلاعات انجام نشد</h1>
      <p className="my-5 leading-8 text-muted-foreground">
        ارتباط با سرویس کامل نشد. چند لحظه دیگر دوباره تلاش کنید؛ اطلاعات
        ثبت‌شده شما محفوظ است.
      </p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </main>
  );
}
