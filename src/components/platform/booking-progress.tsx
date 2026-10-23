"use client";
import { persianDigits } from "@/lib/date-time";
export const BOOKING_STEPS = [
  "نوع و زمین",
  "سانس",
  "تجهیزات",
  "اطلاعات",
  "پرداخت",
];
export function BookingProgress({
  step,
  onBack,
}: {
  step: number;
  onBack?: (step: number) => void;
}) {
  return (
    <nav
      aria-label="مراحل رزرو"
      className="my-5 rounded-2xl border border-border bg-white p-4"
    >
      <p className="mb-3 text-xs leading-6 text-muted-foreground">
        انتخاب سانس و تجهیزات، تکمیل اطلاعات و پرداخت؛ سپس نتیجهٔ تأیید نهایی
        رزرو اطلاع‌رسانی می‌شود.
      </p>
      <ol className="grid grid-cols-5 gap-1">
        {BOOKING_STEPS.map((title, i) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => onBack?.(i)}
              disabled={!onBack || i >= step}
              aria-current={step === i ? "step" : undefined}
              className={`flex min-h-11 w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] ${i === step ? "bg-emerald-50 font-bold text-emerald-900" : "text-muted-foreground"}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full border ${i <= step ? "border-emerald-800" : "border-border"}`}
              >
                {persianDigits(i + 1)}
              </span>
              {title}
            </button>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="mt-3 text-xs">
        مرحلهٔ {persianDigits(step + 1)} از{" "}
        {persianDigits(BOOKING_STEPS.length)} · {BOOKING_STEPS[step]}
      </p>
    </nav>
  );
}
