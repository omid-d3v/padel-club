import Link from "next/link";
import { adminRows } from "@/lib/platform/admin-data";
import { PageHeader } from "@/components/shared";
import { ActionForm } from "@/components/platform/action-form";
import { Field, SelectField, CheckField } from "@/components/platform/fields";
import { money, moment } from "@/lib/platform/format";
export const metadata = { title: "مدیریت باشگاه، زمین و سانس" };
export default async function ManageClubs({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; court?: string; equipment?: string }>;
}) {
  const [q, cities, clubs, courts, equipment, slots, rules] = await Promise.all(
    [
      searchParams,
      adminRows("cities"),
      adminRows("clubs"),
      adminRows("courts"),
      adminRows("equipment"),
      adminRows("court_slots"),
      adminRows("availability_rules"),
    ],
  );
  const club = clubs.find((c) => c.id === q.club);
  const court = courts.find((c) => c.id === q.court);
  const eq = equipment.find((e) => e.id === q.equipment);
  const policy = club?.cancellation_policy;
  const hours =
    typeof policy === "object" && policy && !Array.isArray(policy)
      ? Number(policy.full_refund_hours ?? 24)
      : 24;
  const late =
    typeof policy === "object" && policy && !Array.isArray(policy)
      ? Number(policy.late_refund_percent ?? 0)
      : 0;
  return (
    <>
      <PageHeader
        title="باشگاه، زمین و سانس"
        description="اطلاعات واقعی را ثبت و پس از بررسی منتشر کنید. هیچ باشگاه نمونه‌ای به سایت اضافه نمی‌شود."
      />
      <div className="mb-7 flex flex-wrap gap-2 text-xs">
        {[
          ["#cities", "شهرها"],
          ["#clubs", "باشگاه‌ها"],
          ["#courts", "زمین‌ها"],
          ["#equipment", "تجهیزات"],
          ["#calendar", "تقویم و قیمت"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-xl border border-border bg-white px-4 py-3"
          >
            {label}
          </a>
        ))}
      </div>
      <div className="space-y-8">
        <section id="cities" className="platform-card">
          <h2>شهرها</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {cities.map((c) => (
              <span key={c.id} className="status-pill">
                {c.name}
              </span>
            ))}
          </div>
          <ActionForm
            operation="admin:city"
            label="افزودن شهر"
            className="grid gap-4 md:grid-cols-2"
          >
            <Field label="نام شهر" name="name" required minLength={2} />
            <Field
              label="نشانی کوتاه؛ حروف لاتین و خط تیره"
              name="slug"
              required
              pattern="[a-z0-9-]+"
            />
            <Field
              label="معرفی شهر و پدل در آن"
              name="description"
              maxLength={2000}
            />
          </ActionForm>
        </section>
        <section id="clubs" className="platform-card">
          <h2>{club ? `ویرایش ${club.name}` : "باشگاه تازه"}</h2>
          <div className="mb-6 flex flex-wrap gap-2">
            {clubs.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clubs?club=${c.id}#clubs`}
                className="status-pill"
              >
                {c.name} · {c.published ? "منتشرشده" : "پیش‌نویس"}
              </Link>
            ))}
            {club && (
              <Link href="/admin/clubs#clubs" className="status-pill">
                + باشگاه جدید
              </Link>
            )}
          </div>
          <ActionForm
            key={club?.id ?? "new-club"}
            operation="admin:club"
            label="ذخیره باشگاه"
            className="grid gap-5 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={club?.id ?? ""} />
            <Field
              name="name"
              label="نام باشگاه"
              required
              defaultValue={club?.name}
            />
            <SelectField
              name="city_id"
              label="شهر"
              options={cities}
              value={club?.city_id}
            />
            <Field
              name="slug"
              label="نشانی کوتاه و ثابت باشگاه"
              required
              pattern="[a-z0-9-]+"
              defaultValue={club?.slug}
            />
            <Field
              name="address"
              label="آدرس"
              required
              defaultValue={club?.address}
            />
            <Field
              name="latitude"
              label="عرض جغرافیایی؛ اختیاری"
              type="number"
              step="any"
              defaultValue={club?.latitude ?? ""}
            />
            <Field
              name="longitude"
              label="طول جغرافیایی؛ اختیاری"
              type="number"
              step="any"
              defaultValue={club?.longitude ?? ""}
            />
            <label className="field md:col-span-2">
              معرفی باشگاه
              <textarea
                name="description"
                className="platform-textarea"
                rows={4}
                defaultValue={club?.description}
              />
            </label>
            <Field
              name="facilities"
              label="امکانات؛ با «،» جدا کنید"
              defaultValue={club?.facilities.join("، ")}
            />
            <Field
              name="photo"
              label="تصویر؛ JPG، PNG، WebP، حداکثر ۳ مگابایت"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <label className="field">
              روش رزرو
              <select
                name="booking_mode"
                defaultValue={club?.booking_mode ?? "MANUAL_APPROVAL"}
              >
                <option value="MANUAL_APPROVAL">تأیید دستی باشگاه</option>
                <option value="EXTERNAL_AUTOMATED">
                  اتصال خودکار؛ فقط پس از پیکربندی آداپتر
                </option>
              </select>
            </label>
            <Field
              name="provider_key"
              label="نام اتصال مجاز؛ بدون رمز یا کلید"
              defaultValue={club?.provider_key ?? ""}
            />
            <Field
              name="completion_cutoff_hours"
              type="number"
              min={4}
              max={72}
              label="مهلت تکمیل بازی باز؛ ساعت قبل از شروع"
              defaultValue={club?.completion_cutoff_hours ?? 4}
              required
            />
            <Field
              name="refund_hours"
              type="number"
              min={0}
              max={720}
              label="لغو زودهنگام با استرداد کامل؛ ساعت قبل"
              defaultValue={hours}
              required
            />
            <Field
              name="late_refund_percent"
              type="number"
              min={0}
              max={100}
              label="درصد استرداد لغو دیرهنگام"
              defaultValue={late}
              required
            />
            <CheckField
              name="published"
              label="انتشار عمومی پس از بررسی"
              checked={club?.published}
            />
            <CheckField
              name="featured"
              label="نمایش در باشگاه‌های منتخب"
              checked={club?.featured}
            />
          </ActionForm>
        </section>
        <section id="courts" className="platform-card">
          <h2>{court ? `ویرایش ${court.name}` : "زمین تازه"}</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {courts.map((c) => (
              <Link
                href={`/admin/clubs?court=${c.id}#courts`}
                key={c.id}
                className="status-pill"
              >
                {clubs.find((cl) => cl.id === c.club_id)?.name} · {c.name}
              </Link>
            ))}
          </div>
          <ActionForm
            key={court?.id ?? "new-court"}
            operation="admin:court"
            label="ذخیره زمین"
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={court?.id ?? ""} />
            <SelectField
              name="club_id"
              label="باشگاه"
              options={clubs}
              value={court?.club_id}
            />
            <Field
              name="name"
              label="نام زمین"
              required
              defaultValue={court?.name}
            />
            <Field
              name="external_court_ref"
              label="شناسه زمین در سامانه باشگاه؛ در اتصال خودکار"
              defaultValue={court?.external_court_ref ?? ""}
            />
            <Field
              name="hourly_price"
              label="قیمت پایه یک ساعت؛ تومان"
              type="number"
              required
              min={0}
              defaultValue={(court?.hourly_price ?? 0) / 10}
            />
            <Field
              name="platform_fee"
              label="کارمزد شفاف هر نفر؛ تومان"
              type="number"
              required
              min={0}
              defaultValue={(court?.platform_fee ?? 0) / 10}
            />
            <Field
              name="description"
              label="توضیحات زمین"
              defaultValue={court?.description}
            />
            <CheckField
              name="indoor"
              label="سرپوشیده"
              checked={court?.indoor}
            />
            <CheckField
              name="active"
              label="زمین فعال است"
              checked={court?.active ?? true}
            />
          </ActionForm>
        </section>
        <section id="equipment" className="platform-card">
          <h2>{eq ? `ویرایش ${eq.name}` : "تجهیزات اجاره‌ای"}</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {equipment.map((e) => (
              <Link
                href={`/admin/clubs?equipment=${e.id}#equipment`}
                className="status-pill"
                key={e.id}
              >
                {e.name} · {money(e.price)} · موجودی {e.stock}
              </Link>
            ))}
          </div>
          <ActionForm
            key={eq?.id ?? "new-equipment"}
            operation="admin:equipment"
            label="ذخیره تجهیزات"
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={eq?.id ?? ""} />
            <SelectField
              name="club_id"
              label="باشگاه"
              options={clubs}
              value={eq?.club_id}
            />
            <Field
              name="name"
              label="نام تجهیزات"
              required
              defaultValue={eq?.name}
            />
            <label className="field">
              نوع
              <select name="kind" defaultValue={eq?.kind ?? "personal"}>
                <option value="personal">شخصی؛ مثل راکت</option>
                <option value="shared">مشترک؛ مثل توپ</option>
              </select>
            </label>
            <Field
              name="stock"
              type="number"
              min={0}
              max={10000}
              label="موجودی هم‌زمان"
              required
              defaultValue={eq?.stock ?? 0}
            />
            <Field
              name="price"
              type="number"
              min={0}
              label="اجاره هر واحد برای یک سانس؛ تومان"
              required
              defaultValue={(eq?.price ?? 0) / 10}
            />
            <CheckField
              name="active"
              label="قابل اجاره"
              checked={eq?.active ?? true}
            />
          </ActionForm>
        </section>
        <section id="calendar" className="platform-card">
          <h2>تقویم و قیمت سانس</h2>
          <p className="mb-6 text-xs leading-7 text-muted-foreground">
            زمان‌ها به وقت تهران‌اند. تغییر زمان یا قیمت سانسی که رزرو دارد مجاز
            نیست. سانس‌های هم‌پوشان رد می‌شوند.
          </p>
          <div className="grid gap-8 xl:grid-cols-2">
            <div>
              <h3 className="mb-5 font-bold">یک سانس مشخص</h3>
              <ActionForm operation="admin:slot" label="انتشار سانس">
                <SelectField
                  name="court_id"
                  label="زمین"
                  options={courts.map((c) => ({
                    id: c.id,
                    name: `${clubs.find((cl) => cl.id === c.club_id)?.name} · ${c.name}`,
                  }))}
                />
                <Field
                  name="starts_at"
                  type="datetime-local"
                  label="شروع؛ ورودی میلادی / وقت تهران"
                  required
                />
                <Field
                  name="ends_at"
                  type="datetime-local"
                  label="پایان؛ ورودی میلادی / وقت تهران"
                  required
                />
                <Field
                  name="court_price"
                  type="number"
                  min={0}
                  label="قیمت کل زمین برای این سانس؛ تومان"
                  required
                />
              </ActionForm>
            </div>
            <div>
              <h3 className="mb-5 font-bold">برنامه هفتگی و قیمت‌گذاری</h3>
              <ActionForm operation="admin:rule" label="ذخیره برنامه">
                <SelectField name="court_id" label="زمین" options={courts} />
                <label className="field">
                  روز هفته
                  <select name="weekday">
                    {[
                      ["6", "شنبه"],
                      ["0", "یک‌شنبه"],
                      ["1", "دوشنبه"],
                      ["2", "سه‌شنبه"],
                      ["3", "چهارشنبه"],
                      ["4", "پنج‌شنبه"],
                      ["5", "جمعه"],
                    ].map(([v, n]) => (
                      <option key={v} value={v}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="start_minute"
                  label="دقیقه شروع از نیمه‌شب؛ مثلاً ۹۰۰ برای ۱۵:۰۰"
                  type="number"
                  min={0}
                  max={1439}
                  required
                />
                <Field
                  name="end_minute"
                  label="دقیقه پایان از نیمه‌شب؛ مثلاً ۱۳۲۰ برای ۲۲:۰۰"
                  type="number"
                  min={1}
                  max={1440}
                  required
                />
                <label className="field">
                  طول سانس
                  <select name="slot_minutes">
                    <option value="60">۶۰ دقیقه</option>
                    <option value="90">۹۰ دقیقه</option>
                    <option value="120">۱۲۰ دقیقه</option>
                  </select>
                </label>
                <Field
                  name="price"
                  label="قیمت هر سانس؛ تومان"
                  type="number"
                  required
                  min={0}
                />
              </ActionForm>
              <p className="my-5 text-xs text-muted-foreground">
                {rules.length} برنامه ذخیره‌شده. پس از ثبت برنامه، سانس‌های روز
                دلخواه را تولید کنید.
              </p>
              <ActionForm
                operation="admin:generate"
                label="ساخت سانس‌های این روز"
              >
                <SelectField name="court_id" label="زمین" options={courts} />
                <Field
                  type="date"
                  name="date"
                  label="روز دلخواه؛ ورودی میلادی"
                  required
                />
              </ActionForm>
            </div>
          </div>
          <details className="mt-8">
            <summary className="min-h-11 cursor-pointer font-bold">
              سانس‌های منتشرشده ({slots.length})
            </summary>
            <div className="max-h-96 overflow-auto">
              {slots
                .toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))
                .map((s) => (
                  <p
                    className="border-b border-border py-3 text-xs leading-7"
                    key={s.id}
                  >
                    {courts.find((c) => c.id === s.court_id)?.name} ·{" "}
                    {moment(s.starts_at)} · {money(s.court_price)}
                  </p>
                ))}
            </div>
          </details>
        </section>
      </div>
    </>
  );
}
