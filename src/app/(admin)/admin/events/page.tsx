import Link from "next/link";
import { AdminList } from "@/components/platform/admin-list";
import { DetailPanel } from "@/components/platform/detail-panel";
import { tehranDateTime } from "@/lib/date-time";
import { adminRows } from "@/lib/platform/admin-data";
import { requireMember } from "@/lib/platform/data";
import { ActionForm } from "@/components/platform/action-form";
import { Field, CheckField, SelectField } from "@/components/platform/fields";
import { PageHeader } from "@/components/shared";
import { money, moment, bookingLabels } from "@/lib/platform/format";
import { number } from "@/lib/utils";
export default async function ManageEvents({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; create?: string }>;
}) {
  const [q, m, events, clubs, courts, slots, registrations, secured] =
    await Promise.all([
      searchParams,
      requireMember(),
      adminRows("platform_events"),
      adminRows("clubs"),
      adminRows("courts"),
      adminRows("court_slots"),
      adminRows("event_registrations"),
      adminRows("event_courts"),
    ]);
  const edit = events.find((e) => e.id === q.edit);
  return (
    <>
      <PageHeader
        title="رویدادها و رقابت‌ها"
        description="امریکانو هشت‌نفره از همان موتور و رتبه‌بندی قبلی استفاده می‌کند. ثبت‌نام و پرداخت مستقل‌اند."
      />
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        {edit && (
          <Link className="admin-detail-button" href="/admin/events?create=1">
            افزودن رویداد دیگر
          </Link>
        )}
        <DetailPanel
          key={edit?.id ?? "new"}
          title={edit ? `ویرایش ${edit.title}` : "رویداد تازه"}
          label={edit ? "ویرایش رویداد" : "افزودن رویداد"}
          initiallyOpen={!!edit || q.create === "1"}
        >
          <ActionForm
            key={edit?.id ?? "new"}
            operation="admin:event"
            label="ذخیره رویداد"
            className="grid gap-5 md:grid-cols-2"
          >
            <input name="id" type="hidden" value={edit?.id ?? ""} />
            <Field
              label="عنوان رویداد"
              name="title"
              required
              minLength={2}
              defaultValue={edit?.title}
            />
            <Field
              label="نشانی کوتاه و ثابت"
              name="slug"
              required
              pattern="[A-Za-z0-9 -]+"
              defaultValue={edit?.slug}
            />
            <label className="field">
              نوع
              <select name="kind" defaultValue={edit?.kind ?? "americano"}>
                <option value="americano">
                  امریکانو؛ هشت نفر، دو زمین، هفت دور
                </option>
                <option value="tournament">
                  تورنمنت؛ ثبت‌نام و نتیجه پایه
                </option>
              </select>
            </label>
            <SelectField
              label="باشگاه"
              name="club_id"
              options={clubs}
              value={edit?.club_id}
            />
            <Field
              label="شروع؛ شمسی / وقت تهران"
              name="starts_at"
              type="datetime-local"
              defaultValue={
                edit ? tehranDateTime(new Date(edit.starts_at)) : undefined
              }
              required
            />
            <Field
              label="پایان ثبت‌نام؛ قبل از شروع"
              name="deadline"
              type="datetime-local"
              defaultValue={
                edit
                  ? tehranDateTime(new Date(edit.registration_deadline))
                  : undefined
              }
              required
            />
            <Field
              label="ظرفیت؛ امریکانو دقیقاً ۸ نفر"
              name="capacity"
              type="number"
              min={4}
              max={128}
              required
              defaultValue={edit?.capacity ?? 8}
            />
            <Field
              label="ورودیه هر نفر؛ تومان"
              name="entry_fee"
              type="number"
              min={0}
              required
              defaultValue={(edit?.entry_fee ?? 0) / 10}
            />
            <label className="field md:col-span-2">
              توضیحات، زمان‌بندی و شرایط
              <textarea
                name="description"
                className="platform-textarea"
                rows={4}
                defaultValue={edit?.description}
              />
            </label>
            <CheckField
              name="published"
              label="انتشار عمومی"
              checked={edit?.published}
            />
            <p className="self-center text-xs text-muted-foreground">
              برگزارکننده: حساب احراز هویت‌شده شما. زمین‌ها پیش از ثبت‌نام باید
              واقعاً تأیید شوند.
            </p>
          </ActionForm>
          {edit && (
            <Link href="/admin/events" className="mt-5 block text-sm underline">
              افزودن رویداد دیگر
            </Link>
          )}
        </DetailPanel>
      </div>
      <AdminList
        title="رویدادها"
        items={events.map((e) => ({
          id: e.id,
          title: e.title,
          meta: moment(e.starts_at) + " · ورودیه " + money(e.entry_fee),
          badge: bookingLabels[e.status],
          state: e.status,
          content: (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2>{e.title}</h2>
                <span className="status-pill">{bookingLabels[e.status]}</span>
              </div>
              <p className="text-sm">
                {moment(e.starts_at)} · ورودیه {money(e.entry_fee)} ·{" "}
                {number(
                  registrations.filter(
                    (r) => r.event_id === e.id && r.status === "paid",
                  ).length,
                )}{" "}
                ثبت‌نام قطعی از {number(e.capacity)}
              </p>
              <div className="my-5 flex flex-wrap gap-5 text-sm">
                <Link className="underline" href={`/admin/events?edit=${e.id}`}>
                  ویرایش
                </Link>
                <Link className="underline" href={`/events/${e.slug}`}>
                  صفحه عمومی
                </Link>
                {e.tournament_id && (
                  <Link className="underline" href={`/events/${e.slug}/rounds`}>
                    دورها و ثبت نتیجه
                  </Link>
                )}
              </div>
              {e.status === "registration" && (
                <>
                  <details className="mb-5">
                    <summary className="min-h-11 cursor-pointer font-semibold">
                      ثبت تأیید دو زمین رویداد (
                      {secured.filter((s) => s.event_id === e.id).length} از ۲)
                    </summary>
                    <ActionForm
                      operation="admin:event-courts"
                      label="ثبت زمین‌های تأییدشده"
                      confirm="باشگاه واقعاً هر دو زمین را در زمان رویداد تأیید کرده است؟"
                    >
                      <input name="event_id" value={e.id} type="hidden" />
                      {["slot1", "slot2"].map((name, i) => (
                        <SelectField
                          key={name}
                          name={name}
                          label={`سانس زمین ${i + 1}`}
                          options={slots
                            .filter((s) =>
                              courts.some(
                                (c) =>
                                  c.id === s.court_id &&
                                  c.club_id === e.club_id,
                              ),
                            )
                            .map((s) => ({
                              id: s.id,
                              name: `${courts.find((c) => c.id === s.court_id)?.name} · ${moment(s.starts_at)}`,
                            }))}
                        />
                      ))}
                      <Field
                        name="reference"
                        label="مرجع تأیید باشگاه"
                        minLength={2}
                        required
                      />
                    </ActionForm>
                  </details>
                  <ActionForm
                    operation="admin:activate-event"
                    label="شروع رویداد و ساخت دورها"
                    confirm="ثبت‌نام‌ها، زمین‌ها و زمان‌بندی بررسی شده‌اند؟"
                  >
                    <input name="event_id" type="hidden" value={e.id} />
                  </ActionForm>
                </>
              )}
              {e.status !== "completed" && e.status !== "cancelled" && (
                <details className="mt-5 border-t border-border pt-4">
                  <summary className="min-h-11 cursor-pointer text-sm">
                    پایان یا لغو رویداد
                  </summary>
                  <ActionForm
                    operation="admin:event-state"
                    label="ثبت وضعیت"
                    confirm="تغییر وضعیت رویداد ثبت می‌شود. لغو، درخواست استرداد پرداخت‌های معتبر را ایجاد می‌کند."
                  >
                    <input name="event_id" type="hidden" value={e.id} />
                    <label className="field">
                      وضعیت
                      <select name="status">
                        {e.status === "active" && (
                          <option value="completed">
                            پایان؛ پس از تکمیل همه نتایج
                          </option>
                        )}
                        <option value="cancelled">لغو و ثبت استرداد</option>
                      </select>
                    </label>
                  </ActionForm>
                </details>
              )}
              {e.kind === "tournament" && e.status === "active" && (
                <details className="mt-5 border-t border-border pt-4">
                  <summary className="min-h-11 cursor-pointer font-semibold">
                    ثبت رتبه و امتیاز نهایی
                  </summary>
                  <p className="mb-4 text-xs text-muted-foreground">
                    رتبه‌ها یکتا هستند. این نتیجه، رتبه تاریخی امریکانو یا سطح
                    مهارتی بازیکن را تغییر نمی‌دهد.
                  </p>
                  <ActionForm operation="admin:placement" label="ذخیره نتیجه">
                    <SelectField
                      name="registration_id"
                      label="بازیکن ثبت‌نام‌شده"
                      options={registrations
                        .filter(
                          (r) => r.event_id === e.id && r.status === "paid",
                        )
                        .map((r) => ({ id: r.id, name: r.user_id }))}
                    />
                    <Field
                      name="rank"
                      label="رتبه نهایی"
                      type="number"
                      min={1}
                      max={e.capacity}
                      required
                    />
                    <Field
                      name="points"
                      label="امتیاز کسب‌شده"
                      type="number"
                      min={0}
                      max={1000000}
                      required
                    />
                  </ActionForm>
                </details>
              )}
            </div>
          ),
        }))}
      />
      <p className="mt-6 text-xs text-muted-foreground">
        حساب برگزارکننده فعلی: <bdi>{m.userId}</bdi>
      </p>
    </>
  );
}
