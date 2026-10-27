"use client";
import { useState } from "react";
import { Field } from "./fields";
export function EventKindFields({
  kind = "americano",
  capacity = 8,
}: {
  kind?: string;
  capacity?: number;
}) {
  const [value, setValue] = useState(kind);
  return (
    <>
      <label className="field">
        نوع رقابت
        <select
          name="kind"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="americano">امریکانو؛ هشت نفر، دو زمین، هفت دور</option>
          <option value="tournament">تورنمنت با ثبت‌نام فردی</option>
        </select>
      </label>
      <Field
        name="capacity"
        label="ظرفیت بازیکنان"
        type="number"
        min={value === "americano" ? 8 : 4}
        max={value === "americano" ? 8 : 128}
        readOnly={value === "americano"}
        value={value === "americano" ? 8 : undefined}
        defaultValue={value === "americano" ? undefined : capacity}
        key={value}
        required
      />
    </>
  );
}
export function EventCourtFields({
  slots,
}: {
  slots: { id: string; name: string; court: string }[];
}) {
  const [first, setFirst] = useState("");
  return (
    <>
      <label className="field">
        سانس زمین اول
        <select
          name="slot1"
          required
          value={first}
          onChange={(e) => setFirst(e.target.value)}
        >
          <option value="">انتخاب کنید</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        سانس زمین دوم
        <select name="slot2" required key={first} defaultValue="">
          <option value="">انتخاب کنید</option>
          {slots
            .filter((s) => s.court !== slots.find((s) => s.id === first)?.court)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
      {!slots.length && (
        <p role="status">
          سانس آزاد هم‌زمان با شروع رویداد وجود ندارد. ابتدا سانس‌ها را در تقویم
          باشگاه بسازید.
        </p>
      )}
    </>
  );
}
