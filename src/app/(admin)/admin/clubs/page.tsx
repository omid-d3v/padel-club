import Link from "next/link";
import { AdminList } from "@/components/platform/admin-list";
import { DetailPanel } from "@/components/platform/detail-panel";
import { SPORTS } from "@/components/platform/sport-icon";
import { adminRows } from "@/lib/platform/admin-data";
import { PageHeader } from "@/components/shared";
import { ActionForm } from "@/components/platform/action-form";
import { Field, SelectField, CheckField } from "@/components/platform/fields";
import { money, moment } from "@/lib/platform/format";
export const metadata = { title: "مدیریت باشگاه، زمین و سانس" };
export default async function ManageClubs({
  searchParams,
}: {
  searchParams: Promise<{
    club?: string;
    court?: string;
    equipment?: string;
    view?: string;
    create?: string;
  }>;
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
  const view = q.club
    ? "clubs"
    : q.court
      ? "courts"
      : q.equipment
        ? "equipment"
        : ["cities", "clubs", "courts", "equipment", "calendar"].includes(
              q.view ?? "",
            )
          ? q.view
          : "clubs";
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
      <nav aria-label="بخش‌های باشگاه" className="admin-tabs">
        {[
          ["#cities", "شهرها"],
          ["#clubs", "باشگاه‌ها"],
          ["#courts", "زمین‌ها"],
          ["#equipment", "تجهیزات"],
          ["#calendar", "تقویم و قیمت"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={`/admin/clubs?view=${href.slice(1)}`}
            aria-current={view === href.slice(1) ? "page" : undefined}
            className="rounded-xl border border-border bg-white px-4 py-3"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-8">
        {view === "cities" && (
          <section id="cities" className="platform-card">
            <h2>شهرها</h2>
            <div className="mb-5 flex flex-wrap gap-2">
              {cities.map((c) => (
                <span key={c.id} className="status-pill">
                  {c.name}
                </span>
              ))}
            </div>
            <div className="my-5">
              <DetailPanel
                key={"افزودن شهر"}
                title={"افزودن شهر"}
                label={"افزودن شهر"}
                initiallyOpen={false}
              >
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
                    pattern="[A-Za-z0-9 -]+"
                  />
                  <Field
                    label="معرفی شهر و پدل در آن"
                    name="description"
                    maxLength={2000}
                  />
                </ActionForm>
              </DetailPanel>
            </div>
          </section>
        )}
        {view === "clubs" && (
          <section id="clubs" className="platform-card">
            <h2>{club ? `ویرایش ${club.name}` : "باشگاه تازه"}</h2>
            {club && (
              <Link
                className="admin-detail-button my-4"
                href="/admin/clubs?view=clubs&create=clubs"
              >
                افزودن باشگاه دیگر
              </Link>
            )}
            <AdminList
              title="باشگاه‌ها"
              description="باشگاه‌های غیرفعال فقط در مدیریت باقی می‌مانند و رزرو جدید نمی‌پذیرند. برای تغییر وضعیت، ویرایش باشگاه را باز کنید."
              filters={[
                { value: "active", label: "فعال" },
                { value: "inactive", label: "غیرفعال" },
              ]}
              items={clubs.map((c) => ({
                id: c.id,
                title: c.name,
                meta: c.address,
                badge: c.published ? "فعال" : "غیرفعال",
                state: c.published ? "active" : "inactive",
                href: `/admin/clubs?club=${c.id}#clubs`,
                content: <></>,
              }))}
            />
            <div className="my-5">
              <DetailPanel
                key={club?.id}
                title={club ? `ویرایش ${club.name}` : "ذخیره باشگاه"}
                label={club ? "ویرایش اطلاعات" : "افزودن باشگاه"}
                initiallyOpen={!!club || q.create === "clubs"}
              >
                {club && (
                  <section
                    className="mb-6 rounded-2xl border border-border bg-muted/30 p-5"
                    aria-label="وضعیت فعالیت باشگاه"
                  >
                    <h3 className="font-bold">
                      باشگاه {club.published ? "فعال است" : "غیرفعال است"}
                    </h3>
                    <p className="my-3 text-sm leading-7 text-muted-foreground">
                      {club.published
                        ? "با غیرفعال‌سازی، باشگاه و بازی‌ها و رویدادهای آن از نمایش عمومی حذف می‌شوند و رزرو یا شروع پرداخت جدید مسدود می‌شود. سوابق و رسیدهای قبلی حفظ می‌شوند."
                        : "باشگاه در سایت عمومی نمایش داده نمی‌شود و رزرو جدید نمی‌پذیرد. فعال‌سازی، اطلاعات و سانس‌های منتشرشدهٔ آن را دوباره در دسترس قرار می‌دهد."}
                    </p>
                    <ActionForm
                      key={`${club.id}-${club.published}`}
                      operation="admin:club-status"
                      label={
                        club.published
                          ? "غیرفعال کردن باشگاه"
                          : "فعال کردن باشگاه"
                      }
                      buttonVariant="outline"
                      confirm={
                        club.published
                          ? `باشگاه «${club.name}» غیرفعال شود؟ رزرو جدید متوقف می‌شود؛ رزروها و پرداخت‌های قبلی حذف یا خودکار لغو نمی‌شوند.`
                          : `باشگاه «${club.name}» دوباره در سایت نمایش داده شود و رزرو جدید بپذیرد؟`
                      }
                    >
                      <input type="hidden" name="club_id" value={club.id} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={String(!club.published)}
                      />
                    </ActionForm>
                  </section>
                )}
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
                    minLength={2}
                    maxLength={100}
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
                    pattern="[A-Za-z0-9 -]+"
                    defaultValue={club?.slug}
                  />
                  <Field
                    name="address"
                    label="آدرس"
                    required
                    minLength={3}
                    maxLength={500}
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
                  {!club && (
                    <CheckField
                      name="published"
                      label="باشگاه فعال و قابل نمایش و رزرو باشد"
                    />
                  )}
                  <CheckField
                    name="featured"
                    label="نمایش در باشگاه‌های منتخب"
                    checked={club?.featured}
                  />
                </ActionForm>
              </DetailPanel>
            </div>
          </section>
        )}
        {view === "courts" && (
          <section id="courts" className="platform-card">
            <h2>{court ? `ویرایش ${court.name}` : "زمین تازه"}</h2>
            {court && (
              <Link
                className="admin-detail-button my-4"
                href="/admin/clubs?view=courts&create=courts"
              >
                افزودن زمین دیگر
              </Link>
            )}
            <AdminList
              title="زمین‌ها"
              items={courts.map((c) => ({
                id: c.id,
                title: c.name,
                meta: clubs.find((cl) => cl.id === c.club_id)?.name ?? "",
                badge: SPORTS.find((s) => s.id === c.sport)?.name,
                href: `/admin/clubs?court=${c.id}#courts`,
                content: <></>,
              }))}
            />
            <div className="my-5">
              <DetailPanel
                key={court?.id}
                title={court ? `ویرایش ${court.name}` : "ذخیره زمین"}
                label={court ? "ویرایش اطلاعات" : "افزودن زمین"}
                initiallyOpen={!!court || q.create === "courts"}
              >
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
                  <SelectField
                    name="sport"
                    label="نوع ورزش زمین و آیکون"
                    options={SPORTS}
                    value={court?.sport ?? "padel"}
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
              </DetailPanel>
            </div>
          </section>
        )}
        {view === "equipment" && (
          <section id="equipment" className="platform-card">
            <h2>{eq ? `ویرایش ${eq.name}` : "تجهیزات اجاره‌ای"}</h2>
            {eq && (
              <Link
                className="admin-detail-button my-4"
                href="/admin/clubs?view=equipment&create=equipment"
              >
                افزودن تجهیزات دیگر
              </Link>
            )}
            <AdminList
              title="تجهیزات"
              items={equipment.map((e) => ({
                id: e.id,
                title: e.name,
                meta: money(e.price) + " · موجودی " + e.stock,
                href: `/admin/clubs?equipment=${e.id}#equipment`,
                content: <></>,
              }))}
            />
            <div className="my-5">
              <DetailPanel
                key={eq?.id}
                title={eq ? `ویرایش ${eq.name}` : "ذخیره تجهیزات"}
                label={eq ? "ویرایش اطلاعات" : "افزودن تجهیزات"}
                initiallyOpen={!!eq || q.create === "equipment"}
              >
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
              </DetailPanel>
            </div>
          </section>
        )}
        {view === "calendar" && (
          <section id="calendar" className="platform-card">
            <h2>تقویم و قیمت سانس</h2>
            <p className="mb-6 text-xs leading-7 text-muted-foreground">
              زمان‌ها به وقت تهران‌اند. تغییر زمان یا قیمت سانسی که رزرو دارد
              مجاز نیست. سانس‌های هم‌پوشان رد می‌شوند.
            </p>
            <div className="grid gap-8 xl:grid-cols-2">
              <div>
                <h3 className="mb-5 font-bold">یک سانس مشخص</h3>
                <div className="my-5">
                  <DetailPanel
                    key={"انتشار سانس"}
                    title={"انتشار سانس"}
                    label={"انتشار سانس"}
                    initiallyOpen={false}
                  >
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
                        label="شروع؛ شمسی / وقت تهران"
                        required
                      />
                      <Field
                        name="ends_at"
                        type="datetime-local"
                        label="پایان؛ شمسی / وقت تهران"
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
                  </DetailPanel>
                </div>
              </div>
              <div>
                <h3 className="mb-5 font-bold">برنامه هفتگی و قیمت‌گذاری</h3>
                <div className="my-5">
                  <DetailPanel
                    key={"ذخیره برنامه"}
                    title={"ذخیره برنامه"}
                    label={"ذخیره برنامه"}
                    initiallyOpen={false}
                  >
                    <ActionForm operation="admin:rule" label="ذخیره برنامه">
                      <SelectField
                        name="court_id"
                        label="زمین"
                        options={courts}
                      />
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
                  </DetailPanel>
                </div>
                <p className="my-5 text-xs text-muted-foreground">
                  {rules.length} برنامه ذخیره‌شده. پس از ثبت برنامه، سانس‌های
                  روز دلخواه را تولید کنید.
                </p>
                <div className="my-5">
                  <DetailPanel
                    key={"ساخت سانس‌های این روز"}
                    title={"ساخت سانس‌های این روز"}
                    label={"ساخت سانس‌های این روز"}
                    initiallyOpen={false}
                  >
                    <ActionForm
                      operation="admin:generate"
                      label="ساخت سانس‌های این روز"
                    >
                      <SelectField
                        name="court_id"
                        label="زمین"
                        options={courts}
                      />
                      <Field
                        type="date"
                        name="date"
                        label="روز دلخواه؛ شمسی"
                        required
                      />
                    </ActionForm>
                  </DetailPanel>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <AdminList
                title="سانس‌های منتشرشده"
                description="سانس را با نام زمین، باشگاه یا تاریخ شمسی پیدا کنید."
                items={slots
                  .toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .map((s) => ({
                    id: s.id,
                    title:
                      courts.find((c) => c.id === s.court_id)?.name ?? "زمین",
                    meta: moment(s.starts_at) + " · " + money(s.court_price),
                    badge: s.published ? "منتشرشده" : "غیرقابل رزرو",
                    state: s.published ? "published" : "hidden",
                    search: clubs.find(
                      (cl) =>
                        cl.id ===
                        courts.find((c) => c.id === s.court_id)?.club_id,
                    )?.name,
                    content: (
                      <dl className="admin-facts">
                        <div>
                          <dt>شروع</dt>
                          <dd>{moment(s.starts_at)}</dd>
                        </div>
                        <div>
                          <dt>پایان</dt>
                          <dd>{moment(s.ends_at)}</dd>
                        </div>
                        <div>
                          <dt>قیمت سانس</dt>
                          <dd>{money(s.court_price)}</dd>
                        </div>
                      </dl>
                    ),
                  }))}
              />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
