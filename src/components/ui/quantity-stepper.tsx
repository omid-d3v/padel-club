"use client";
import { Minus, Plus } from "lucide-react";
import { persianDigits } from "@/lib/date-time";
export function QuantityStepper({
  label,
  value,
  max,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const limit = Math.max(0, Math.floor(max));
  return (
    <div
      role="group"
      aria-label={`انتخاب تعداد ${label}`}
      className="quantity-stepper"
      dir="ltr"
    >
      <button
        type="button"
        aria-label={`کاهش تعداد ${label}`}
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus size={18} />
      </button>
      <output
        aria-label={`تعداد ${label}`}
        aria-live="polite"
        className="tabular-nums"
      >
        {persianDigits(value)}
      </output>
      <button
        type="button"
        aria-label={`افزایش تعداد ${label}`}
        disabled={disabled || value >= limit}
        onClick={() => onChange(Math.min(limit, value + 1))}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
