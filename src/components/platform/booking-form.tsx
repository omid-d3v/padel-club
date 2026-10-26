"use client";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  startTransition,
  type ReactNode,
} from "react";
import type { Club, Court, Equipment, Slot } from "@/lib/platform/types";
import { SkillOptions, SkillHelp } from "./skill-select";
import { previewBookingDiscount } from "@/app/product-actions";
import { money, moment, time, cancellationText } from "@/lib/platform/format";
import { ActionForm } from "./action-form";
import { Field } from "./fields";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { AvailabilityPicker } from "./availability-picker";
import { BookingAccess } from "./booking-access";
import { EquipmentIcon, SportIcon } from "./sport-icon";
import { Users, LockKeyhole, Check } from "lucide-react";
import { BookingProgress, BOOKING_STEPS } from "./booking-progress";
import { PaymentMethodFields, type PaymentMethods } from "./payment-chooser";

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
  authenticated = true,
  needsProfile = false,
  phoneEnabled = false,
  initialEquipment = {},
  initialKind = "private",
  navigation,
  methods = { card: false, zarinpal: false },
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
  authenticated?: boolean;
  needsProfile?: boolean;
  phoneEnabled?: boolean;
  initialEquipment?: Record<string, number>;
  initialKind?: "private" | "open";
  navigation?: ReactNode;
  methods?: PaymentMethods;
}) {
  const [kind, setKind] = useState(initialKind),
    [slotId, setSlotId] = useState(initialSlotId),
    [quantities, setQuantities] = useState(initialEquipment),
    [key, setKey] = useState(requestKey);
  const [rawStep, setStep] = useState(
      initialSlotId && initialKind === "private" ? 1 : 0,
    ),
    [error, setError] = useState("");
  const [name, setName] = useState(""),
    [skill, setSkill] = useState("1"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [accepted, setAccepted] = useState(false),
    [chosenMethod, setMethod] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const draftKey = `matchsho:booking:${club.id}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      const saved = raw ? JSON.parse(raw) : null;
      startTransition(() => {
        if (saved && saved.version === 1 && Date.now() - saved.at < 7200000) {
          if (
            initialKind !== "open" &&
            (saved.kind === "open" || saved.kind === "private")
          )
            setKind(saved.kind);
          setTitle(String(saved.title ?? "").slice(0, 100));
          setDescription(String(saved.description ?? "").slice(0, 2000));
          setMin(/^[0-5]$/.test(saved.min) ? saved.min : "");
          setMax(/^[0-5]$/.test(saved.max) ? saved.max : "");
          setQuantities(
            Object.fromEntries(
              equipment.flatMap((e) => {
                const n = saved.quantities?.[e.id];
                return Number.isInteger(n) && n > 0
                  ? [[e.id, Math.min(n, e.stock, 20)]]
                  : [];
              }),
            ),
          );
          if (
            !initialSlotId &&
            saved.court === court.id &&
            slots.some((s) => s.id === saved.slot && s.available)
          )
            setSlotId(saved.slot);
        }
        setHydrated(true);
      });
    } catch {
      startTransition(() => setHydrated(true));
    }
    // Restore once for this court/date; prices and availability always come from the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  const skipInformation = authenticated && !needsProfile;
  const step = rawStep === 3 && skipInformation ? 4 : rawStep;
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 1,
          at: Date.now(),
          court: court.id,
          slot: slotId,
          kind,
          title,
          description,
          min,
          max,
          quantities,
        }),
      );
    } catch {}
  }, [
    hydrated,
    draftKey,
    court.id,
    slotId,
    kind,
    title,
    description,
    min,
    max,
    quantities,
  ]);
  const [discountCode, setDiscountCode] = useState(""),
    [discount, setDiscount] = useState<{
      key: string;
      total: number;
      discount: number;
    } | null>(null),
    [discountMessage, setDiscountMessage] = useState("");
  const [checkingDiscount, checkDiscount] = useTransition();
  const discountKey = JSON.stringify([
    slotId,
    kind,
    quantities,
    discountCode.trim().toUpperCase(),
  ]);
  const appliedDiscount = discount?.key === discountKey ? discount : null;
  const root = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    root.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const active = slots.filter(
    (s) =>
      s.available &&
      (kind !== "open" ||
        Date.parse(s.starts_at) > now + club.completion_cutoff_hours * 3600000),
  );
  const slot = active.find((s) => s.id === slotId);
  const sum = (type: string) =>
    equipment
      .filter((e) => e.kind === type)
      .reduce((total, e) => total + e.price * (quantities[e.id] ?? 0), 0);
  const share = (value: number) =>
    kind === "private" ? value : Math.floor(value / 4) + (value % 4);
  const personal = sum("personal"),
    shared = sum("shared"),
    total = slot
      ? share(slot.court_price) + share(shared) + personal + court.platform_fee
      : 0;
  const directPay =
    kind === "private" && club.booking_mode === "MANUAL_APPROVAL";
  const method =
    (chosenMethod === "card_transfer" && methods.card) ||
    (chosenMethod === "zarinpal" && methods.zarinpal)
      ? chosenMethod
      : methods.card
        ? "card_transfer"
        : methods.zarinpal
          ? "zarinpal"
          : "";
  const go = (next: number) => {
    setError("");
    const target = next === 2 ? (step > 2 ? 1 : 3) : next;
    setStep(target === 3 && skipInformation ? (step > target ? 1 : 4) : target);
  };
  const next = () => {
    if (
      step === 0 &&
      kind === "open" &&
      (title.trim().length < 2 ||
        (min === "") !== (max === "") ||
        (min !== "" && Number(min) > Number(max)))
    ) {
      setError("عنوان بازی و محدودهٔ سطح را کامل و معتبر انتخاب کن.");
      return;
    }
    if (step === 1 && !slot) {
      setError("ابتدا یک سانس آزاد انتخاب کن.");
      return;
    }
    if (
      step === 3 &&
      (!authenticated || (needsProfile && name.trim().length < 2))
    ) {
      setError(
        authenticated
          ? "نام و نام خانوادگی را کامل وارد کن."
          : "برای ادامه، وارد حساب شو.",
      );
      return;
    }
    go(Math.min(step + 1, 4));
  };
  const returnTo = `/clubs/${club.slug}/book?court=${court.id}&date=${startDay}&slot=${slotId}&kind=${kind}&equipment=${encodeURIComponent(JSON.stringify(quantities))}`;
  return (
    <div
      ref={root}
      className="mx-auto max-w-2xl scroll-mt-24"
      data-booking-step={step}
    >
      <p className="mb-3 text-sm">
        انتخاب‌ها تا دو ساعت در همین مرورگر حفظ می‌شوند؛ مبلغ و موجودی هنگام ثبت
        بررسی می‌شوند.
      </p>
      <BookingProgress
        step={step}
        skipInformation={skipInformation}
        onBack={(i) => {
          if (i < step) go(i);
        }}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3 text-xs leading-6">
        <span>
          {club.name} · {court.name}
        </span>
        {slot && (
          <span>
            {moment(slot.starts_at)} تا {time(slot.ends_at)}
          </span>
        )}
      </div>
      <h2 ref={heading} tabIndex={-1} className="mb-4 !text-xl outline-none">
        {BOOKING_STEPS[step]}
      </h2>
      {step === 0 && navigation}
      {step === 3 && (!authenticated || needsProfile) ? (
        <>
          <BookingAccess
            phoneEnabled={phoneEnabled}
            returnTo={returnTo}
            needsProfile={authenticated && needsProfile}
          />
          <Button
            className="booking-auth-back"
            variant="outline"
            type="button"
            onClick={() => go(1)}
          >
            مرحلهٔ قبل
          </Button>
        </>
      ) : (
        <ActionForm
          operation="request"
          clearDraft={draftKey}
          className="space-y-5"
          showSubmit={step === 4}
          buttonVariant="default"
          actionBarClassName="booking-actions"
          navigationActions={
            <>
              <Button
                variant="outline"
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0}
              >
                مرحلهٔ قبل
              </Button>
              {step < 4 && (
                <Button type="button" className="flex-1" onClick={next}>
                  {step === 2 ? "ادامه با این تجهیزات" : "مرحلهٔ بعد"}
                </Button>
              )}
            </>
          }
          label={
            directPay
              ? method === "card_transfer"
                ? "ادامه واریز کارت‌به‌کارت"
                : "پرداخت و ثبت رزرو"
              : kind === "open"
                ? "ثبت بازی و درخواست رزرو"
                : "ثبت رزرو"
          }
          disabled={
            (directPay && !!discountCode.trim() && !appliedDiscount) ||
            checkingDiscount ||
            !authenticated ||
            !slot ||
            (directPay && !method) ||
            (club.booking_mode === "EXTERNAL_AUTOMATED" && !providerReady)
          }
        >
          <input type="hidden" name="kind" value={kind} />
          <input
            type="hidden"
            name="discount_code"
            value={
              directPay && appliedDiscount
                ? discountCode.trim().toUpperCase()
                : ""
            }
          />
          <input
            type="hidden"
            name="discount_total"
            value={directPay && appliedDiscount ? appliedDiscount.total : ""}
          />
          <input type="hidden" name="slot_id" value={slot?.id ?? ""} />
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
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="description" value={description} />
          <input
            type="hidden"
            name="min_skill"
            value={kind === "open" ? min : ""}
          />
          <input
            type="hidden"
            name="max_skill"
            value={kind === "open" ? max : ""}
          />
          {needsProfile && (
            <>
              <input type="hidden" name="display_name" value={name} />
              <input type="hidden" name="skill_level" value={skill} />
              <input type="hidden" name="city_id" value={club.city_id} />
            </>
          )}
          {step === 0 && (
            <section className="platform-card space-y-5">
              <fieldset>
                <legend className="mb-3 text-sm font-bold">
                  چطور بازی می‌کنی؟
                </legend>
                <div
                  role="group"
                  aria-label="نوع رزرو"
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    ["private", "رزرو خصوصی زمین", "با گروه خودت"],
                    ["open", "بازی باز چهار نفره", "با هم‌بازی‌های تازه"],
                  ].map(([value, label, detail]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={kind === value}
                      onClick={() => {
                        if (kind !== value) {
                          setKind(value as "private" | "open");
                          setAccepted(false);
                          setKey(crypto.randomUUID());
                          if (
                            value === "open" &&
                            slot &&
                            Date.parse(slot.starts_at) <=
                              now + club.completion_cutoff_hours * 3600000
                          )
                            setSlotId("");
                        }
                      }}
                      className={`booking-kind-card ${kind === value ? "is-selected" : ""}`}
                    >
                      <span className="booking-kind-art" aria-hidden="true">
                        <SportIcon width={58} height={58} />
                        {value === "private" ? (
                          <LockKeyhole size={26} />
                        ) : (
                          <Users size={30} />
                        )}
                      </span>
                      <span className="booking-kind-check" aria-hidden="true">
                        {kind === value && <Check size={16} />}
                      </span>
                      <b className="block text-sm">{label}</b>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {detail}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <p className="text-sm leading-7 text-muted-foreground">
                {kind === "private"
                  ? "کل هزینهٔ زمین و تجهیزات انتخابی را برای گروه خودت می‌پردازی؛ رزرو به جذب بازیکن وابسته نیست."
                  : `فقط سهم خودت را می‌پردازی؛ بازی باید تا ${club.completion_cutoff_hours} ساعت قبل از شروع، چهار نفر و تسویهٔ لازم را داشته باشد.`}
              </p>
              {kind === "open" && (
                <>
                  <Field
                    name="game_title"
                    label="عنوان بازی"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    minLength={2}
                    maxLength={100}
                  />
                  <label className="field">
                    توضیح کوتاه
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={2000}
                      className="platform-textarea"
                    />
                  </label>
                  <SkillHelp />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="field">
                      حداقل سطح
                      <select
                        value={min}
                        onChange={(e) => setMin(e.target.value)}
                      >
                        <option value="">بدون محدودیت</option>
                        <SkillOptions />
                      </select>
                    </label>
                    <label className="field">
                      حداکثر سطح
                      <select
                        value={max}
                        onChange={(e) => setMax(e.target.value)}
                      >
                        <option value="">بدون محدودیت</option>
                        <SkillOptions />
                      </select>
                    </label>
                  </div>
                </>
              )}
            </section>
          )}
          {step === 1 && (
            <div className="platform-card">
              <AvailabilityPicker
                priceMode={kind}
                fee={court.platform_fee}
                slots={slots.map((s) => ({
                  ...s,
                  available: active.some((a) => a.id === s.id),
                }))}
                now={now}
                startDay={startDay}
                value={slotId}
                onChange={(id) => {
                  setSlotId(id);
                  setKey(crypto.randomUUID());
                  if (id) go(3);
                }}
              />
            </div>
          )}
          {step === 3 && (
            <section
              className="platform-card space-y-4"
              aria-label="اطلاعات رزروکننده"
            >
              {needsProfile ? (
                <>
                  <p className="text-sm leading-7">
                    فقط یک بار؛ رزرو به نام چه کسی ثبت شود؟
                  </p>
                  <Field
                    name="profile_name"
                    label="نام و نام خانوادگی"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                  />
                  <label className="field">
                    سطح بازی
                    <select
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                    >
                      <SkillOptions />
                    </select>
                  </label>
                </>
              ) : (
                <p className="text-sm leading-7">
                  وارد حساب شده‌ای و اطلاعات لازم آماده است؛ رزرو را ادامه بده.
                </p>
              )}
            </section>
          )}
          {step === 4 && (
            <section className="platform-card space-y-5">
              <h3 className="font-bold">یک نگاه آخر به رزرو</h3>
              <p className="text-sm leading-7">
                {kind === "private" ? "رزرو خصوصی زمین" : "بازی باز چهار نفره"}{" "}
                ·{" "}
                {slot
                  ? moment(slot.starts_at)
                  : "سانس انتخاب‌شده دیگر در دسترس نیست"}
              </p>
              <details className="rounded-xl border border-border p-4">
                <summary className="min-h-11 cursor-pointer font-bold">
                  تجهیزات اجاره‌ای؛ اختیاری
                </summary>{" "}
                <section className="platform-card space-y-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    انتخاب تجهیزات اختیاری است. اگر وسایل خودت را داری، بدون
                    انتخاب ادامه بده.
                  </p>
                  {equipment.length ? (
                    equipment.map((e) => (
                      <div className="equipment-choice" key={e.id}>
                        <span className="flex items-center gap-3 text-sm">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-900">
                            <EquipmentIcon name={e.name} />
                          </span>
                          <span>
                            {e.name}
                            <small className="mt-1 block text-muted-foreground">
                              {money(e.price)} ·{" "}
                              {e.kind === "shared" && kind === "open"
                                ? "بین چهار نفر تقسیم می‌شود"
                                : "برای انتخاب تو"}
                            </small>
                          </span>
                        </span>
                        <QuantityStepper
                          label={e.name}
                          value={quantities[e.id] ?? 0}
                          max={Math.min(20, e.stock)}
                          onChange={(value) => {
                            setQuantities((p) => ({ ...p, [e.id]: value }));
                            setKey(crypto.randomUUID());
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm">
                      تجهیزات اجاره‌ای منتشر نشده؛ وسایل شخصی همراه داشته باش.
                    </p>
                  )}
                </section>
              </details>
              <dl className="price-lines">
                <div>
                  <dt>{kind === "open" ? "سهم زمین" : "زمین"}</dt>
                  <dd>{slot ? money(share(slot.court_price)) : "—"}</dd>
                </div>
                <div>
                  <dt>تجهیزات مشترک</dt>
                  <dd>{money(share(shared))}</dd>
                </div>
                <div>
                  <dt>تجهیزات شخصی</dt>
                  <dd>{money(personal)}</dd>
                </div>
                <div>
                  <dt>کارمزد</dt>
                  <dd>{money(court.platform_fee)}</dd>
                </div>
                <div>
                  <dt>{kind === "open" ? "برآورد سهم تو" : "جمع پرداخت"}</dt>
                  <dd>{money(appliedDiscount?.total ?? total)}</dd>
                </div>
              </dl>
              {directPay && (
                <details className="rounded-xl border border-border p-4">
                  <summary className="min-h-11 cursor-pointer text-sm font-bold">
                    کد تخفیف دارم
                  </summary>
                  <label className="field">
                    کد تخفیف
                    <input
                      className="min-h-12 rounded-xl border p-3"
                      value={discountCode}
                      maxLength={40}
                      dir="ltr"
                      onChange={(e) => {
                        setDiscountCode(e.target.value);
                        setDiscountMessage("");
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!slot || !discountCode.trim() || checkingDiscount}
                    onClick={() =>
                      checkDiscount(async () => {
                        if (!slot) return;
                        const result = await previewBookingDiscount({
                          slot: slot.id,
                          kind,
                          code: discountCode.trim(),
                          equipment: Object.entries(quantities)
                            .filter(([, n]) => n > 0)
                            .map(([id, quantity]) => ({ id, quantity })),
                        });
                        setDiscountMessage(result.message);
                        if (result.quote)
                          setDiscount({ key: discountKey, ...result.quote });
                        else setDiscount(null);
                      })
                    }
                  >
                    {checkingDiscount
                      ? "در حال بررسی تخفیف…"
                      : "بررسی و اعمال تخفیف"}
                  </Button>
                  <p role="status" className="mt-3 text-sm">
                    {discountMessage}
                  </p>
                  {appliedDiscount && (
                    <p className="text-sm font-bold text-emerald-800">
                      تخفیف: {money(appliedDiscount.discount)}؛ جمع پرداخت:{" "}
                      {money(appliedDiscount.total)}
                    </p>
                  )}
                  {discountCode.trim() && !appliedDiscount && (
                    <p className="text-sm">
                      پیش از ادامه، کد را بررسی یا پاک کنید.
                    </p>
                  )}
                </details>
              )}
              {directPay && (
                <PaymentMethodFields
                  methods={methods}
                  value={method}
                  onChange={setMethod}
                />
              )}
              <p className="text-xs leading-7 text-muted-foreground">
                {directPay
                  ? "پس از تأیید پرداخت، رزرو وارد مرحلهٔ تأیید نهایی می‌شود. در صورت تغییر ظرفیت، زمان جایگزین هم‌قیمت یا درخواست بازگشت کامل وجه در اختیار شماست."
                  : "ثبت درخواست به معنی دریافت پول یا رزرو قطعی نیست؛ وضعیت تأیید و پرداخت در حساب اطلاع‌رسانی می‌شود."}
              </p>
              <details>
                <summary className="min-h-11 cursor-pointer text-sm">
                  شرایط لغو و استرداد
                </summary>
                <p className="text-xs leading-7">
                  {cancellationText(club.cancellation_policy)}
                </p>
              </details>
              <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
                <input
                  type="checkbox"
                  name="accept_terms"
                  required
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 size-5"
                />
                شرایط رزرو، پرداخت و لغو را خواندم و می‌پذیرم.
              </label>
            </section>
          )}
          {error && (
            <p role="alert" className="text-sm leading-7 text-red-700">
              {error}
            </p>
          )}
        </ActionForm>
      )}
    </div>
  );
}
