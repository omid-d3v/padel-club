"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AvailabilityPicker, type AvailableSlot } from "./availability-picker";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { replacementCalendar } from "@/app/reschedule-actions";
import { moment } from "@/lib/platform/format";
import { tehranToday } from "@/lib/date-time";

export function ReschedulePicker({
  bookingId,
  currentTime,
}: {
  bookingId: string;
  currentTime: string;
}) {
  const [open, setOpen] = useState(false),
    [pending, start] = useTransition();
  const [slots, setSlots] = useState<AvailableSlot[]>([]),
    [selected, setSelected] = useState("");
  const [now, setNow] = useState(0),
    [error, setError] = useState("");
  const chosen = slots.find((s) => s.id === selected);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(true);
          setError("");
          setSelected("");
          start(async () => {
            try {
              const result = await replacementCalendar(bookingId);
              setSlots(result.slots);
              setNow(result.now);
            } catch {
              setError("تقویم دریافت نشد. پنجره را ببندید و دوباره تلاش کنید.");
            }
          });
        }}
      >
        پیشنهاد تاریخ و ساعت جایگزین
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="پیشنهاد سانس جایگزین"
        description="ابتدا سانس آزاد را انتخاب کنید. پیشنهاد برای ثبت‌کنندهٔ رزرو ارسال می‌شود و پس از تأیید او، دوباره باید زمین را رزرو کنید."
      >
        <p className="rounded-xl bg-muted p-4 text-sm">
          زمان فعلی: {moment(currentTime)}
          <br />
          مبلغ رزرو تغییر نمی‌کند.
        </p>
        {pending ? (
          <p role="status" className="py-5">
            در حال دریافت تقویم زمین…
          </p>
        ) : error ? (
          <p role="alert" className="py-5 text-red-700">
            {error}
          </p>
        ) : now > 0 ? (
          <>
            <AvailabilityPicker
              slots={slots}
              now={now}
              startDay={tehranToday(new Date(now))}
              value={selected}
              onChange={setSelected}
            />
            {!slots.some((s) => s.available) && (
              <p className="py-4 text-sm">
                در دو هفتهٔ آینده سانس آزاد هم‌قیمت و هم‌مدت پیدا نشد.
              </p>
            )}
            <ActionForm
              operation="admin:propose-slot"
              label="ارسال پیشنهاد به کاربر"
              disabled={!chosen}
              confirm={
                chosen
                  ? `پیشنهاد ${moment(chosen.starts_at)} با همان مبلغ برای کاربر ارسال شود؟ رزرو واقعی پس از تأیید کاربر انجام می‌شود.`
                  : undefined
              }
            >
              <input type="hidden" name="booking_id" value={bookingId} />
              <input type="hidden" name="slot_id" value={selected} />
              {chosen && (
                <p className="rounded-xl border border-primary p-4 text-sm">
                  زمان پیشنهادی: {moment(chosen.starts_at)}
                </p>
              )}
              <Field
                name="note"
                label="دلیل تغییر و توضیح برای کاربر"
                required
                minLength={2}
                maxLength={500}
              />
            </ActionForm>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
