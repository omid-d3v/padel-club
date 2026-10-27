"use client";
import { persianDigits } from "@/lib/date-time";
import {
  MapPin,
  CalendarDays,
  ShoppingBag,
  UserRound,
  CreditCard,
  Check,
} from "lucide-react";
export const BOOKING_STEPS = [
  "نوع و زمین",
  "سانس",
  "تجهیزات",
  "اطلاعات",
  "مرور و پرداخت",
];
const icons = [MapPin, CalendarDays, ShoppingBag, UserRound, CreditCard];
export function BookingProgress({
  step,
  onBack,
  skipInformation = false,
}: {
  step: number;
  onBack?: (step: number) => void;
  skipInformation?: boolean;
}) {
  const steps = BOOKING_STEPS.map((title, id) => ({ title, id })).filter(
    (s) => s.id !== 2 && (!skipInformation || s.id !== 3),
  );
  const current = steps.findIndex((s) => s.id === step);
  return (
    <nav aria-label="مراحل رزرو" className="booking-progress">
      <div className="mb-5 flex items-center justify-between text-xs">
        <span className="font-bold text-emerald-900">رزرو زمین</span>
        <span role="status" aria-live="polite">
          مرحلهٔ {persianDigits(current + 1)} از {persianDigits(steps.length)} ·{" "}
          {BOOKING_STEPS[step]}
        </span>
      </div>
      <ol className="flex">
        {steps.map(({ title, id }) => {
          const Icon = icons[id];
          return (
            <li
              key={id}
              className={`booking-progress-item ${id < step ? "is-complete" : ""}`}
            >
              <button
                type="button"
                disabled={!onBack || id >= step}
                onClick={() => onBack?.(id)}
                aria-current={step === id ? "step" : undefined}
                className="booking-progress-button"
              >
                <span className="booking-progress-icon">
                  {id < step ? (
                    <Check size={20} aria-hidden="true" />
                  ) : (
                    <Icon size={20} aria-hidden="true" />
                  )}
                </span>
                <span>{title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
