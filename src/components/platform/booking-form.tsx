"use client";
import { useState } from "react";
import type { Club, Court, Equipment, Slot } from "@/lib/platform/types";
import { SKILLS } from "@/lib/platform/types";
import { money, cancellationText } from "@/lib/platform/format";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { EquipmentIcon } from "./sport-icon";
import { AvailabilityPicker } from "./availability-picker";
export function BookingForm({
  club,
  court,
  slots,
  equipment,
  providerReady = false,
  now,
  requestKey,
  startDay,
  initialSlotId = "",
}: {
  club: Club;
  court: Court;
  slots: (Omit<Slot, "court_id" | "published"> & { available: boolean })[];
  equipment: Equipment[];
  providerReady?: boolean;
  now: number;
  requestKey: string;
  startDay: string;
  initialSlotId?: string;
}) {
  const [kind, setKind] = useState("private");
  const [slotId, setSlotId] = useState(initialSlotId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [key] = useState(requestKey);
  const slot = slots.find((s) => s.id === slotId && s.available);
  const personal = equipment
    .filter((e) => e.kind === "personal")
    .reduce((s, e) => s + e.price * (quantities[e.id] ?? 0), 0);
  const shared = equipment
    .filter((e) => e.kind === "shared")
    .reduce((s, e) => s + e.price * (quantities[e.id] ?? 0), 0);
  const share = (value: number) =>
    kind === "private" ? value : Math.floor(value / 4) + (value % 4);
  const active = slots.filter(
    (s) =>
      s.available &&
      (kind !== "open" ||
        new Date(s.starts_at).getTime() >
          now + club.completion_cutoff_hours * 3600000),
  );
  return (
    <ActionForm
      operation="request"
      label={
        kind === "private" ? "ارسال درخواست رزرو" : "درخواست زمین و ساخت بازی"
      }
      disabled={
        !active.some((s) => s.id === slotId) ||
        (club.booking_mode === "EXTERNAL_AUTOMATED" && !providerReady)
      }
      className="content-grid"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="platform-card">
          <h2>چه‌جوری بازی می‌کنی؟</h2>
          <div className="flex flex-wrap gap-3">
            {[
              ["private", "رزرو خصوصی زمین"],
              ["open", "بازی باز چهار نفره"],
            ].map(([value, label]) => (
              <label
                className="flex min-h-12 items-center gap-2 text-sm"
                key={value}
              >
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => {
                    setKind(value);
                    setSlotId("");
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            در بازی باز فقط سهم خودت را می‌پردازی. ظرفیت باید تا{" "}
            {new Intl.NumberFormat("fa-IR").format(
              club.completion_cutoff_hours,
            )}{" "}
            ساعت قبل از شروع تکمیل شود؛ مهلت زودتر نگه‌داشت باشگاه مقدم است.
          </p>
        </div>
        <div className="platform-card -order-1">
          <p className="mb-4 text-xs text-muted-foreground">
            سانس‌های {court.name}
          </p>
          <input
            type="hidden"
            name="slot_id"
            value={active.some((s) => s.id === slotId) ? slotId : ""}
          />
          <AvailabilityPicker
            slots={slots.map((s) => ({
              ...s,
              available: active.some((a) => a.id === s.id),
            }))}
            now={now}
            startDay={startDay}
            value={slotId}
            onChange={setSlotId}
          />
        </div>
        {kind === "open" && (
          <div className="platform-card form-stack">
            <h2>قرار بازی</h2>
            <Field
              label="عنوان بازی"
              name="title"
              required
              minLength={2}
              maxLength={100}
              placeholder="مثلاً بازی عصر پنجشنبه"
            />
            <label className="field">
              توضیح کوتاه
              <textarea
                name="description"
                maxLength={2000}
                className="platform-textarea"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["min_skill", "حداقل سطح"],
                ["max_skill", "حداکثر سطح"],
              ].map(([name, label]) => (
                <label className="field" key={name}>
                  {label}
                  <select name={name}>
                    <option value="">بدون محدودیت</option>
                    {SKILLS.map((skill, i) => (
                      <option key={skill} value={i}>
                        {skill}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              سطح پروفایل خودت هم باید در همین محدوده باشد. انتخاب حداقل و
              حداکثر یکسان یعنی سطح دقیق.
            </p>
          </div>
        )}
        <div className="platform-card">
          <h2>تجهیزات لازم</h2>
          {equipment.length ? (
            equipment.map((e) => (
              <label
                className="mb-4 flex items-center justify-between gap-4 text-sm"
                key={e.id}
              >
                <span>
                  <EquipmentIcon name={e.name} />
                  {e.name}
                  <small className="mt-1 block text-muted-foreground">
                    {e.kind === "shared"
                      ? "بین چهار نفر تقسیم می‌شود"
                      : "مخصوص خودت"}{" "}
                    · {e.price ? money(e.price) : "رایگان"}
                  </small>
                </span>
                <input
                  aria-label={`تعداد ${e.name}`}
                  type="number"
                  min={0}
                  max={Math.min(20, e.stock)}
                  value={quantities[e.id] ?? 0}
                  onChange={(event) =>
                    setQuantities((p) => ({
                      ...p,
                      [e.id]: Math.max(
                        0,
                        Math.min(20, Number(event.target.value)),
                      ),
                    }))
                  }
                  className="h-12 w-20 rounded-lg border border-border p-3"
                />
              </label>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              تجهیزات اجاره‌ای منتشر نشده است؛ وسایل شخصی همراه داشته باشید.
            </p>
          )}
        </div>
      </div>
      <aside className="platform-card sticky-card">
        <h2>قبل از ثبت، همه‌چیز روشن</h2>
        <input type="hidden" name="idempotency_key" value={key} />
        <input
          type="hidden"
          name="equipment"
          value={JSON.stringify(
            Object.entries(quantities)
              .filter(([, quantity]) => quantity > 0)
              .map(([id, quantity]) => ({ id, quantity })),
          )}
        />
        {kind === "private" && (
          <>
            <input type="hidden" name="min_skill" value="" />
            <input type="hidden" name="max_skill" value="" />
          </>
        )}
        <div className="price-lines">
          <div>
            <span>{kind === "open" ? "سهم زمین، حداکثر" : "هزینه زمین"}</span>
            <span>{slot ? money(share(slot.court_price)) : "—"}</span>
          </div>
          <div>
            <span>تجهیزات مشترک</span>
            <span>{money(share(shared))}</span>
          </div>
          <div>
            <span>تجهیزات شخصی</span>
            <span>{money(personal)}</span>
          </div>
          <div>
            <span>کارمزد هر نفر</span>
            <span>{money(court.platform_fee)}</span>
          </div>
          <div>
            <span>برآورد سهم شما</span>
            <span>
              {slot
                ? money(
                    share(slot.court_price) +
                      share(shared) +
                      personal +
                      court.platform_fee,
                  )
                : "—"}
            </span>
          </div>
        </div>
        <p className="my-5 text-xs leading-7 text-muted-foreground">
          مبلغ نهایی و موجودی در سرور بازبینی می‌شود. ارسال درخواست به معنی رزرو
          قطعی یا دریافت پول نیست.
        </p>
        <div className="rounded-xl bg-muted p-4 text-xs leading-7">
          {cancellationText(club.cancellation_policy)}
          <br />
          بازی باز ناقص در مهلت تکمیل لغو و درخواست استرداد کامل ثبت می‌شود.
        </div>
        <label className="mt-5 flex min-h-12 items-start gap-3 text-xs leading-7">
          <input
            type="checkbox"
            name="accept_terms"
            required
            className="mt-1 size-5 shrink-0"
          />
          شرایط لغو، تقسیم هزینه و غیرقطعی‌بودن زمین تا تأیید را خواندم و
          می‌پذیرم.
        </label>
        {club.booking_mode === "EXTERNAL_AUTOMATED" && !providerReady && (
          <p role="status" className="mt-4 text-sm text-amber-800">
            اتصال آنلاین این باشگاه هنوز برای رزرو آماده نیست.
          </p>
        )}
      </aside>
    </ActionForm>
  );
}
