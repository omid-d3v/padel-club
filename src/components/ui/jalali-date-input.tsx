"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DAY_MS,
  JALALI_MONTHS,
  formatJalaliInput,
  jalaliMonth,
  jalaliParts,
  jalaliToGregorian,
  parseJalaliInput,
  persianDigits,
  tehranToday,
} from "@/lib/date-time";

type Props = Pick<
  ComponentProps<"input">,
  | "id"
  | "name"
  | "defaultValue"
  | "required"
  | "disabled"
  | "readOnly"
  | "className"
  | "min"
  | "max"
  | "form"
  | "aria-label"
> & { type?: "date" | "datetime-local" };
export function JalaliDateInput({
  type = "date",
  name,
  defaultValue,
  required,
  disabled,
  readOnly,
  className,
  min,
  max,
  id,
  form,
  "aria-label": ariaLabel,
}: Props) {
  const withTime = type === "datetime-local";
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initial =
    typeof defaultValue === "string"
      ? formatJalaliInput(defaultValue, withTime)
      : "";
  const [raw, setRaw] = useState(initial);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [draft, setDraft] = useState(() => jalaliParts(tehranToday()));
  const [clock, setClock] = useState("18:00");
  const canonical = parseJalaliInput(raw, withTime);
  const valid =
    !!canonical &&
    (!min || canonical >= String(min)) &&
    (!max || canonical <= String(max));
  const error =
    raw && !valid
      ? "تاریخ یا ساعت شمسی معتبر وارد کنید."
      : required && !raw
        ? "تاریخ شمسی را انتخاب کنید."
        : "";
  const month = jalaliMonth(draft.year, draft.month);
  const draftDate = jalaliToGregorian(draft.year, draft.month, draft.day)!;
  useEffect(() => {
    inputRef.current?.setCustomValidity(error);
  }, [error]);
  useEffect(() => {
    const element = inputRef.current?.form;
    const reset = () => {
      setRaw(initial);
      setTouched(false);
    };
    element?.addEventListener("reset", reset);
    return () => element?.removeEventListener("reset", reset);
  }, [initial]);
  function showCalendar() {
    const selected = canonical?.slice(0, 10) ?? tehranToday();
    setDraft(jalaliParts(selected));
    setClock(canonical?.slice(11, 16) || "18:00");
    setOpen(true);
  }
  function changeMonth(delta: number) {
    const absolute = draft.year * 12 + draft.month - 1 + delta;
    setDraft({
      year: Math.floor(absolute / 12),
      month: (absolute % 12) + 1,
      day: 1,
    });
  }
  const selectable = (date: string) => !min || date >= String(min).slice(0, 10);
  const beforeMax = (date: string) => !max || date <= String(max).slice(0, 10);
  const selectedValue = `${draftDate}${withTime ? `T${clock}` : ""}`;
  const selectedAllowed =
    selectable(draftDate) &&
    beforeMax(draftDate) &&
    (!min || selectedValue >= String(min)) &&
    (!max || selectedValue <= String(max));
  return (
    <span className="block min-w-0">
      <span className="relative block">
        <input
          ref={inputRef}
          type="text"
          id={id}
          form={form}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => setTouched(true)}
          onInvalid={() => setTouched(true)}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={ariaLabel}
          aria-describedby={`${uid}-hint${touched && error ? ` ${uid}-error` : ""}`}
          aria-invalid={!!raw && !valid}
          autoComplete="off"
          dir="ltr"
          placeholder={withTime ? "۱۴۰۵/۰۸/۰۱ ۱۸:۳۰" : "۱۴۰۵/۰۸/۰۱"}
          className={cn(
            "min-h-12 w-full rounded-xl border border-border bg-white py-2 pl-3 pr-12 text-left text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:bg-muted disabled:opacity-60",
            className,
          )}
        />
        <input
          type="hidden"
          name={name}
          form={form}
          value={valid ? canonical! : ""}
          disabled={disabled}
        />
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || readOnly}
          onClick={(e) => {
            e.preventDefault();
            showCalendar();
          }}
          aria-label="باز کردن تقویم شمسی"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="absolute right-0 top-0 grid size-12 place-items-center rounded-xl text-emerald-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
        >
          <CalendarDays size={19} />
        </button>
      </span>
      <span
        id={`${uid}-hint`}
        className="mt-1 block text-xs font-normal leading-6 text-muted-foreground"
      >
        {withTime
          ? "تاریخ شمسی · ساعت ۲۴ ساعته · به وقت تهران"
          : "تقویم شمسی · به وقت تهران"}
      </span>
      {touched && error && (
        <span
          id={`${uid}-error`}
          role="alert"
          className="block text-xs font-normal leading-6 text-red-700"
        >
          {error}
        </span>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) triggerRef.current?.focus();
        }}
        title={withTime ? "انتخاب تاریخ و ساعت شمسی" : "انتخاب تاریخ شمسی"}
        description="روز دلخواه را در تقویم شمسی انتخاب کنید. تمام ساعت‌ها به وقت تهران هستند."
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={draft.year === 1200 && draft.month === 1}
            aria-label="ماه قبل"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-border"
          >
            <ChevronRight size={18} />
          </button>
          <label className="min-w-0 flex-1 text-xs">
            ماه
            <select
              aria-label="ماه شمسی"
              value={draft.month}
              onChange={(e) =>
                setDraft({ ...draft, month: Number(e.target.value), day: 1 })
              }
              className="min-h-11 w-full rounded-xl border border-border bg-white px-2 text-base"
            >
              {JALALI_MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs">
            سال
            <select
              aria-label="سال شمسی"
              value={draft.year}
              onChange={(e) =>
                setDraft({ ...draft, year: Number(e.target.value), day: 1 })
              }
              className="min-h-11 w-full rounded-xl border border-border bg-white px-2 text-base"
            >
              {Array.from({ length: 400 }, (_, i) => 1200 + i).map((year) => (
                <option key={year} value={year}>
                  {persianDigits(year)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={draft.year === 1599 && draft.month === 12}
            aria-label="ماه بعد"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-border"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <div
          role="group"
          aria-label={`روزهای ${JALALI_MONTHS[draft.month - 1]} ${persianDigits(draft.year)}`}
          className="mt-4 grid grid-cols-7 gap-1 text-center"
        >
          {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day, i) => (
            <span
              key={i}
              aria-hidden
              className="py-2 text-xs text-muted-foreground"
            >
              {day}
            </span>
          ))}
          {Array.from({ length: month.offset }, (_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {Array.from({ length: month.length }, (_, i) => {
            const day = i + 1;
            const date = new Date(
              Date.parse(`${month.start}T12:00:00Z`) + i * DAY_MS,
            )
              .toISOString()
              .slice(0, 10);
            return (
              <button
                key={day}
                type="button"
                disabled={!selectable(date) || !beforeMax(date)}
                aria-label={`${persianDigits(day)} ${JALALI_MONTHS[draft.month - 1]} ${persianDigits(draft.year)}`}
                aria-pressed={day === draft.day}
                onClick={() => setDraft({ ...draft, day })}
                className={cn(
                  "min-h-11 rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-30",
                  day === draft.day
                    ? "bg-primary font-bold text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {persianDigits(day)}
              </button>
            );
          })}
        </div>
        {withTime && (
          <fieldset className="mt-4 flex items-center gap-3 rounded-xl bg-muted p-3">
            <legend className="text-xs">ساعت تهران</legend>
            <label className="flex-1 text-xs">
              ساعت
              <select
                value={clock.slice(0, 2)}
                onChange={(e) =>
                  setClock(`${e.target.value}:${clock.slice(3)}`)
                }
                className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-base"
              >
                {Array.from({ length: 24 }, (_, i) =>
                  String(i).padStart(2, "0"),
                ).map((hour) => (
                  <option key={hour} value={hour}>
                    {persianDigits(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-xs">
              دقیقه
              <select
                value={clock.slice(3)}
                onChange={(e) =>
                  setClock(`${clock.slice(0, 2)}:${e.target.value}`)
                }
                className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-base"
              >
                {Array.from({ length: 60 }, (_, i) =>
                  String(i).padStart(2, "0"),
                ).map((minute) => (
                  <option key={minute} value={minute}>
                    {persianDigits(minute)}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        )}
        <p aria-live="polite" className="my-4 text-center text-sm">
          {formatJalaliInput(selectedValue, withTime)}
          {withTime ? " · تهران" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selectedAllowed}
            onClick={() => {
              setRaw(formatJalaliInput(selectedValue, withTime));
              setTouched(false);
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="min-h-12 flex-1 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50"
          >
            {withTime ? "انتخاب تاریخ و ساعت" : "انتخاب تاریخ"}
          </button>
          <button
            type="button"
            onClick={() => setDraft(jalaliParts(tehranToday()))}
            className="min-h-12 rounded-xl border border-border px-4 text-sm"
          >
            امروز
          </button>
          {!required && (
            <button
              type="button"
              onClick={() => {
                setRaw("");
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="min-h-12 rounded-xl border border-border px-4 text-sm"
            >
              پاک کردن
            </button>
          )}
        </div>
      </Dialog>
    </span>
  );
}
