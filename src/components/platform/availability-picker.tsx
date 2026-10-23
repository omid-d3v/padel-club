"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Clock3, CalendarDays } from "lucide-react";
import { DayStrip } from "@/components/ui/day-strip";
import {
  formatPersianDate,
  tehranToday,
  tehranDateTime,
  persianDigits,
} from "@/lib/date-time";
import { money, time } from "@/lib/platform/format";
import { cn } from "@/lib/utils";
export type AvailableSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  court_price: number;
  available: boolean;
};
export function AvailabilityPicker({
  slots,
  now,
  startDay,
  value,
  onChange,
  bookingHref,
}: {
  slots: AvailableSlot[];
  now: number;
  startDay: string;
  value?: string;
  onChange?: (id: string) => void;
  bookingHref?: string;
}) {
  const usable = slots
    .filter((s) => Date.parse(s.starts_at) > now)
    .toSorted((a, b) => a.starts_at.localeCompare(b.starts_at));
  const [day, setDay] = useState(() =>
    tehranToday(
      new Date(
        usable.find((s) => s.id === value)?.starts_at ??
          `${startDay}T12:00:00Z`,
      ),
    ),
  );
  const [preview, setPreview] = useState("");
  const selected = value ?? preview;
  const counts: Record<string, number> = {};
  for (const s of usable)
    if (s.available) {
      const key = tehranToday(new Date(s.starts_at));
      counts[key] = (counts[key] ?? 0) + 1;
    }
  const daily = usable.filter(
    (s) => tehranToday(new Date(s.starts_at)) === day,
  );
  const chosen = usable.find((s) => s.id === selected && s.available);
  const choose = (id: string) => {
    setPreview(id);
    onChange?.(id);
  };
  return (
    <section className="availability-picker" aria-label="تقویم سانس‌ها">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-bold tracking-wide text-emerald-800">
            وقت بازی تو
          </p>
          <h2 className="!mb-0">روز و ساعت بازی</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs">
          <Clock3 size={13} />
          ساعت تهران
        </span>
      </div>
      <DayStrip
        start={startDay}
        selected={day}
        counts={counts}
        today={tehranToday(new Date(now))}
        onSelect={(next) => {
          setDay(next);
          choose("");
        }}
      />
      <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
        روزها را ورق بزن و ساعت دلخواهت را انتخاب کن. موجودی هنگام ثبت دوباره
        بررسی می‌شود.
      </p>
      <div className="mb-5 mt-6 flex items-center justify-between gap-2 border-b border-border pb-4">
        <h3 className="text-sm font-bold">{formatPersianDate(day)}</h3>
        <span className="text-xs text-muted-foreground">
          {persianDigits(counts[day] ?? 0)} سانس آزاد
        </span>
      </div>
      <div aria-live="polite" aria-atomic="false">
        {[
          ["صبح", 0, 12],
          ["ظهر", 12, 17],
          ["عصر و شب", 17, 24],
        ].map(([label, from, to]) => {
          const group = daily.filter((s) => {
            const h = Number(
              tehranDateTime(new Date(s.starts_at)).slice(11, 13),
            );
            return h >= Number(from) && h < Number(to);
          });
          if (!group.length) return null;
          return (
            <div key={String(label)} className="mb-5">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-slot-id={s.id}
                    aria-label={`سانس ${time(s.starts_at)} تا ${time(s.ends_at)}`}
                    aria-pressed={selected === s.id}
                    disabled={!s.available}
                    onClick={() => choose(s.id)}
                    className={cn(
                      "slot-tile",
                      selected === s.id && "is-selected",
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span
                        dir="ltr"
                        className="text-base font-extrabold tabular-nums"
                      >
                        {time(s.starts_at)}{" "}
                        <span className="text-xs font-normal opacity-60">
                          – {time(s.ends_at)}
                        </span>
                      </span>
                      {selected === s.id && <Check size={16} />}
                    </span>
                    <span className="mt-2 flex flex-wrap justify-between gap-1 text-[11px]">
                      <span>
                        {persianDigits(
                          Math.round(
                            (Date.parse(s.ends_at) - Date.parse(s.starts_at)) /
                              60000,
                          ),
                        )}{" "}
                        دقیقه
                      </span>
                      <span>
                        {s.available ? money(s.court_price) : "در دسترس نیست"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!counts[day] && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-7 text-center">
            <CalendarDays
              className="mx-auto mb-3 text-muted-foreground"
              size={26}
            />
            <p className="text-sm font-bold">برای این روز سانس آزادی نداریم</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              روز دیگری را انتخاب کن یا بازه تقویم را تغییر بده.
            </p>
            {usable.some((s) => s.available) && (
              <button
                type="button"
                onClick={() => {
                  const first = usable.find((s) => s.available)!;
                  setDay(tehranToday(new Date(first.starts_at)));
                  choose("");
                }}
                className="mt-4 min-h-11 rounded-xl border border-emerald-800 px-4 text-xs font-bold text-emerald-900"
              >
                رفتن به نخستین روز آزاد
              </button>
            )}
          </div>
        )}
      </div>
      {chosen && (
        <div className="mt-5 rounded-2xl bg-[#0f5d3a] p-4 text-white">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Check size={17} />
            سانس انتخاب شد
          </p>
          <p className="mt-2 text-xs leading-6">
            {formatPersianDate(chosen.starts_at)} · {time(chosen.starts_at)} تا{" "}
            {time(chosen.ends_at)} · {money(chosen.court_price)}
          </p>
          {bookingHref && (
            <Link
              href={`/login?next=${encodeURIComponent(`${bookingHref}&slot=${chosen.id}`)}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              ورود و ادامه رزرو
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
