"use client";
import {
  DAY_MS,
  formatPersianDate,
  jalaliParts,
  persianDigits,
  TIME_ZONE,
} from "@/lib/date-time";
import { cn } from "@/lib/utils";
export function DayStrip({
  start,
  selected,
  onSelect,
  counts,
  days = 7,
  today,
}: {
  start: string;
  selected: string;
  onSelect: (day: string) => void;
  counts?: Record<string, number>;
  days?: number;
  today: string;
}) {
  return (
    <div className="day-strip" role="group" aria-label="انتخاب روز">
      {Array.from({ length: days }, (_, i) => {
        const day = new Date(Date.parse(`${start}T12:00:00Z`) + i * DAY_MS)
          .toISOString()
          .slice(0, 10);
        const p = jalaliParts(day);
        const count = counts?.[day] ?? 0;
        const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + DAY_MS)
          .toISOString()
          .slice(0, 10);
        const label =
          day === today
            ? "امروز"
            : day === tomorrow
              ? "فردا"
              : new Intl.DateTimeFormat("fa-IR", {
                  timeZone: TIME_ZONE,
                  weekday: "short",
                }).format(new Date(`${day}T12:00:00Z`));
        return (
          <button
            type="button"
            key={day}
            aria-label={formatPersianDate(day)}
            aria-pressed={selected === day}
            onClick={() => onSelect(day)}
            className={cn("day-tile", selected === day && "is-selected")}
          >
            <span className="text-xs">{label}</span>
            <span className="text-2xl font-extrabold tabular-nums">
              {persianDigits(p.day)}
            </span>
            <span className="text-[11px]">
              {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                timeZone: TIME_ZONE,
                month: "short",
              }).format(new Date(`${day}T12:00:00Z`))}
            </span>
            {counts && (
              <span className="mt-1 flex items-center justify-center gap-1 text-[10px]">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    count ? "bg-emerald-500" : "bg-stone-300",
                  )}
                />
                {count ? `${persianDigits(count)} سانس` : "بدون سانس"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
