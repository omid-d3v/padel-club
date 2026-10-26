import Link from "next/link";
import { DetailPanel } from "@/components/platform/detail-panel";
import { AdminList } from "@/components/platform/admin-list";
import { requireAdmin } from "@/lib/auth";
import { adminRows } from "@/lib/platform/admin-data";
import { PageHeader } from "@/components/shared";
import { ActionForm } from "@/components/platform/action-form";
import { CheckField, Field, SelectField } from "@/components/platform/fields";
import { CalendarStatusRefresh } from "@/components/platform/calendar-status-refresh";
import { money, moment } from "@/lib/platform/format";
import type { Json } from "@/lib/supabase/database.types";
export const metadata = { title: "اتصال تقویم باشگاه‌ها" };
const sources = {
  guilan: { name: "گیلان پدل کلاب", url: "https://guilanpadelclub.ir/booking" },
  sabaland: { name: "سرزمین صبا", url: "https://sabalandcomplex.ir/booking/" },
  respina: {
    name: "تنیس رسپینا",
    url: "https://respina.gildev.ir/tennis/book",
  },
};
const statuses: Record<string, string> = {
  pending: "در انتظار بررسی",
  syncing: "در حال همگام‌سازی",
  ok: "فعال و به‌روز",
  needs_mapping: "نیازمند انتساب باشگاه و زمین",
  login_required: "نیازمند دسترسی / ورود",
  error: "خطا",
  disabled: "غیرفعال",
  superseded: "تنظیمات تغییر کرده",
};
const errors: Record<string, string> = {
  LOGIN_REQUIRED:
    "منبع دسترسی عمومی را نپذیرفت؛ ورود یا مجوز باشگاه باید بررسی شود.",
  SOURCE_CHANGED: "ساختار پاسخ سایت تغییر کرده؛ اتصال نیازمند بررسی است.",
  SOURCE_UNAVAILABLE:
    "سایت منبع پاسخ معتبر نداد؛ اتصال اینترنت یا وضعیت سایت را بررسی کنید.",
  RATE_LIMITED: "سایت منبع تعداد درخواست‌ها را محدود کرده است.",
  COURT_REMOVED: "زمین نگاشت‌شده دیگر در منبع پیدا نشد.",
  INCOMPLETE_CALENDAR: "تقویم کامل دریافت نشد؛ داده ناقص منتشر نشده است.",
  WORKER_TIMEOUT:
    "خواندن منبع در مهلت مقرر تمام نشد؛ تلاش بعدی زمان‌بندی شده است.",
};
function discovered(value: Json) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) =>
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    typeof v.reference === "string" &&
    typeof v.name === "string" &&
    typeof v.price === "number"
      ? [{ reference: v.reference, name: v.name, price: v.price }]
      : [],
  );
}
export default async function Integrations() {
  const db = await requireAdmin();
  const [connections, mappings, clubs, courts, history, scheduler] =
    await Promise.all([
      adminRows("calendar_connections"),
      adminRows("calendar_court_mappings"),
      adminRows("clubs"),
      adminRows("courts"),
      db
        .from("calendar_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(30),
      db.rpc("calendar_scheduler_status"),
    ]);
  if (history.error || scheduler.error)
    throw new Error("دریافت وضعیت اتصال‌ها انجام نشد.");
  const ready = scheduler.data?.active && scheduler.data.configured;
  return (
    <>
      <PageHeader
        title="اتصال تقویم باشگاه‌ها"
        description="سانس‌ها از سایت رسمی باشگاه خوانده می‌شوند. فاصله پیش‌فرض یک ساعت است و برای هر اتصال قابل تنظیم است."
      />
      <div className="platform-card mb-6 space-y-3">
        <p className="font-bold">
          زمان‌بند:{" "}
          {ready ? "فعال" : "تنظیم‌نشده؛ همگام‌سازی خودکار آماده نیست"}
        </p>
        <CalendarStatusRefresh />
        <p className="text-sm leading-7 text-muted-foreground">
          ابتدا باشگاه را انتخاب و ذخیره کنید؛ سپس زمین داخلی را به زمین منبع
          متصل کنید.{" "}
          <Link href="/admin/clubs" className="underline">
            مدیریت باشگاه و زمین
          </Link>
          . اتصال تقویم، رزرو یا پرداخت در سایت باشگاه انجام نمی‌دهد؛ قطعی‌شدن
          رزرو همچنان به تأیید باشگاه وابسته است.
        </p>
      </div>
      <div className="space-y-6">
        {connections.map((c) => {
          const source = sources[c.source];
          const external = discovered(c.discovered_courts);
          const assigned = mappings.filter(
            (m) => m.connection_id === c.id && m.active,
          );
          return (
            <section key={c.id} className="platform-card space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2>{source.name}</h2>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                  >
                    مشاهده تقویم رسمی
                  </a>
                </div>
                <span className="status-pill">
                  {!c.enabled
                    ? statuses.disabled
                    : (statuses[c.status] ?? c.status)}
                </span>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">آخرین تلاش</dt>
                  <dd>
                    {c.last_attempt_at
                      ? moment(c.last_attempt_at)
                      : "هنوز اجرا نشده"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">آخرین دریافت موفق</dt>
                  <dd>
                    {c.last_success_at
                      ? moment(c.last_success_at)
                      : "هنوز دریافت نشده"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">نوبت بعدی</dt>
                  <dd>{c.enabled ? moment(c.next_sync_at) : "متوقف"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    سانس‌های آخرین دریافت
                  </dt>
                  <dd>{c.last_slot_count.toLocaleString("fa-IR")}</dd>
                </div>
              </dl>
              {c.last_error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
                >
                  {errors[c.last_error] ??
                    "خطای همگام‌سازی؛ گزارش اتصال را بررسی کنید."}
                </p>
              )}
              {!c.club_id && (
                <p className="text-sm text-amber-800">
                  منبع هنوز به باشگاهی متصل نشده است. تا تعیین باشگاه و نگاشت
                  زمین، سانسی وارد سایت نمی‌شود.
                </p>
              )}
              <DetailPanel
                title={`مدیریت اتصال ${source.name}`}
                label={`مدیریت اتصال ${source.name}`}
              >
                <ActionForm
                  operation="admin:calendar-configure"
                  confirmWhen={{
                    field: "club_id",
                    original: c.club_id ?? "",
                    message:
                      "باشگاه مقصد تغییر می‌کند. نگاشت‌های قبلی پاک و سانس‌های واردشده غیرفعال می‌شوند. رزروهای موجود حفظ می‌شوند. ادامه می‌دهید؟",
                  }}
                  label="ذخیره تنظیمات اتصال"
                  className="grid gap-4 md:grid-cols-3"
                >
                  <input type="hidden" name="connection_id" value={c.id} />
                  <SelectField
                    label="باشگاه مقصد"
                    name="club_id"
                    options={clubs}
                    value={c.club_id ?? ""}
                    required={false}
                  />
                  <Field
                    label="فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)"
                    name="interval_minutes"
                    type="number"
                    min={15}
                    max={1440}
                    defaultValue={c.interval_minutes}
                    required
                  />
                  <Field
                    label="بازه دریافت (روز، ۱ تا ۱۴)"
                    name="horizon_days"
                    type="number"
                    min={1}
                    max={14}
                    defaultValue={c.horizon_days}
                    required
                  />
                  <CheckField
                    name="enabled"
                    label="همگام‌سازی فعال باشد"
                    checked={c.enabled}
                  />
                  <p className="text-xs leading-6 text-muted-foreground">
                    تغییر باشگاه، نگاشت‌های قبلی را پاک و سانس‌های واردشده را
                    غیرفعال می‌کند. رزروهای ثبت‌شده حفظ می‌شوند.
                  </p>
                </ActionForm>
                <ActionForm
                  operation="admin:calendar-refresh"
                  label="درخواست همگام‌سازی اکنون"
                  disabled={!c.enabled || !ready}
                >
                  <input type="hidden" name="connection_id" value={c.id} />
                </ActionForm>
                <div className="border-t border-border pt-4">
                  <h3 className="mb-3 font-bold">زمین‌های منبع و نگاشت</h3>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {external.map((e) => (
                      <span key={e.reference} className="status-pill">
                        {e.name} · {money(e.price)}
                      </span>
                    ))}
                  </div>
                  {c.club_id && external.length > 0 && (
                    <ActionForm
                      operation="admin:calendar-map"
                      label="اتصال زمین"
                      className="grid gap-4 md:grid-cols-2"
                    >
                      <input type="hidden" name="connection_id" value={c.id} />
                      <SelectField
                        label="زمین در مچ شو"
                        name="court_id"
                        options={courts.filter(
                          (ct) => ct.club_id === c.club_id && ct.active,
                        )}
                      />
                      <SelectField
                        label="زمین در سایت باشگاه"
                        name="external_ref"
                        options={external.map((e) => ({
                          id: e.reference,
                          name: e.name,
                        }))}
                      />
                    </ActionForm>
                  )}
                  <ul className="mt-4 space-y-3">
                    {assigned.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3 text-sm"
                      >
                        <span>
                          {courts.find((ct) => ct.id === m.court_id)?.name} ←{" "}
                          {external.find((e) => e.reference === m.external_ref)
                            ?.name ?? m.external_ref}
                        </span>
                        <ActionForm
                          operation="admin:calendar-unmap"
                          label="قطع اتصال زمین"
                          confirm="سانس‌های این اتصال از دسترس رزرو خارج می‌شوند. ادامه می‌دهید؟"
                        >
                          <input type="hidden" name="mapping_id" value={m.id} />
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                </div>
              </DetailPanel>
            </section>
          );
        })}
      </div>
      <div className="mt-6">
        <AdminList
          title="آخرین اجراها"
          description="۳۰ اجرای اخیر؛ جزئیات دریافت و تعارض در پرونده هر اجرا."
          items={history.data.map((r) => ({
            id: r.id,
            title:
              sources[connections.find((c) => c.id === r.connection_id)!.source]
                .name,
            meta: moment(r.started_at),
            badge: statuses[r.status] ?? r.status,
            state: r.status,
            content: (
              <dl className="admin-facts">
                <div>
                  <dt>پایان</dt>
                  <dd>
                    {r.finished_at ? moment(r.finished_at) : "در حال اجرا"}
                  </dd>
                </div>
                <div>
                  <dt>دریافت / واردشده</dt>
                  <dd>
                    {r.slot_count.toLocaleString("fa-IR")} /{" "}
                    {r.imported_count.toLocaleString("fa-IR")}
                  </dd>
                </div>
                <div>
                  <dt>تعارض</dt>
                  <dd>{r.conflict_count.toLocaleString("fa-IR")}</dd>
                </div>
                <div>
                  <dt>توضیح</dt>
                  <dd>
                    {r.message
                      ? (errors[r.message] ?? "نیازمند بررسی")
                      : "بدون خطای ثبت‌شده"}
                  </dd>
                </div>
              </dl>
            ),
          }))}
        />
      </div>
    </>
  );
}
