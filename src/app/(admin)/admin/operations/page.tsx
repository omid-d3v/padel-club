import Link from "next/link";
import { Countdown } from "@/components/platform/countdown";
import { adminRows } from "@/lib/platform/admin-data";
import { PageHeader } from "@/components/shared";
import { ActionForm } from "@/components/platform/action-form";
import { Field, CheckField, SelectField } from "@/components/platform/fields";
import { money, moment, bookingLabels } from "@/lib/platform/format";
import { retryVerifyPayment } from "@/app/payment-actions";
import { number } from "@/lib/utils";
export default async function Operations() {
  const now = await requestTime();
  const [participants, codes] = await Promise.all([
    adminRows("booking_participants"),
    adminRows("discount_codes"),
  ]);
  const [
    bookings,
    slots,
    courts,
    clubs,
    profiles,
    payments,
    refunds,
    attempts,
    results,
    audit,
    players,
  ] = await Promise.all([
    adminRows("bookings"),
    adminRows("court_slots"),
    adminRows("courts"),
    adminRows("clubs"),
    adminRows("user_profiles"),
    adminRows("payments"),
    adminRows("refunds"),
    adminRows("provider_attempts"),
    adminRows("result_submissions"),
    adminRows("audit_log"),
    adminRows("players"),
  ]);
  const names = (uid: string) =>
    profiles.find((p) => p.user_id === uid)?.display_name ?? "کاربر";
  const pending = bookings.filter((b) => b.status === "pending_club");
  const expiring = bookings.filter(
    (b) =>
      b.hold_expires_at &&
      new Date(b.hold_expires_at).getTime() < now + 3600000 &&
      ["collecting", "awaiting_payment"].includes(b.status),
  );
  return (
    <>
      <PageHeader
        title="اتاق عملیات باشگاه"
        description="رزرو، نگه‌داشت، پرداخت و استرداد را مستقل بررسی کنید."
      />
      <section className="platform-card mb-6">
        <h2>کدهای تخفیف</h2>
        <ActionForm
          operation="admin:discount"
          label="ساخت کد تخفیف"
          className="grid gap-4 md:grid-cols-3"
        >
          <Field label="کد انگلیسی" name="code" required minLength={3} />
          <SelectField
            label="نوع تخفیف"
            name="kind"
            options={[
              { id: "percent", name: "درصدی" },
              { id: "fixed", name: "مبلغ ثابت؛ تومان" },
            ]}
          />
          <Field
            label="مقدار (درصد یا تومان)"
            name="value"
            type="number"
            min={1}
            required
          />
          <Field
            label="سقف کل استفاده؛ هر حساب یک بار"
            name="max_uses"
            type="number"
            min={1}
            required
          />
          <Field
            label="تاریخ انقضا؛ تهران"
            name="expires_at"
            type="datetime-local"
            required
          />
          <CheckField name="active" label="فعال" checked />
        </ActionForm>
        <div className="mt-4 space-y-2">
          {codes.map((c) => (
            <details key={c.id}>
              <summary>
                {c.code} · {c.active ? "فعال" : "غیرفعال"} ·{" "}
                {moment(c.expires_at)}
              </summary>
              <ActionForm operation="admin:discount" label="به‌روزرسانی کد">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="code" value={c.code} />
                <input type="hidden" name="kind" value={c.kind} />
                <input
                  type="hidden"
                  name="value"
                  value={c.kind === "fixed" ? c.value / 10 : c.value}
                />
                <input type="hidden" name="max_uses" value={c.max_uses} />
                <Field
                  name="expires_at"
                  type="datetime-local"
                  label="انقضای جدید"
                  required
                />
                <CheckField
                  name="active"
                  label="فعال بماند"
                  checked={c.active}
                />
              </ActionForm>
            </details>
          ))}
        </div>
      </section>
      <section className="platform-card mb-6">
        <h2>رزرو بدون پرداخت؛ معافیت سهم بازیکن</h2>
        <p className="mb-4 text-sm">
          فقط پس از نگه‌داشت واقعی باشگاه. معافیت با دلیل ثبت می‌شود و تراکنش
          بانکی ساختگی ایجاد نمی‌کند؛ بازی باز پس از تسویه چهار سهم قطعی می‌شود.
        </p>
        {participants
          .filter(
            (p) =>
              p.status === "reserved" &&
              bookings.some(
                (b) =>
                  b.id === p.booking_id &&
                  ["awaiting_payment", "collecting"].includes(b.status),
              ),
          )
          .map((p) => (
            <div
              className="my-4 rounded-xl border border-border p-4"
              key={p.id}
            >
              <p>
                {names(p.user_id)} ·{" "}
                {money(
                  p.court_share + p.shared_share + p.personal_price + p.fee,
                )}
              </p>
              {p.lock_expires_at && (
                <Countdown
                  now={now}
                  deadline={p.lock_expires_at}
                  label="مهلت این جایگاه"
                />
              )}
              <ActionForm
                operation="admin:waive"
                label="صفر کردن مبلغ و تسویه بدون پرداخت"
                confirm="تمام مبلغ این سهم معاف و در گزارش مالی ثبت می‌شود. تأیید می‌کنید؟"
              >
                <input type="hidden" name="participant_id" value={p.id} />
                <Field
                  name="reason"
                  label="دلیل معافیت"
                  required
                  minLength={3}
                />
              </ActionForm>
            </div>
          ))}
      </section>
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ["در انتظار باشگاه", pending.length],
          ["نگه‌داشت رو به پایان", expiring.length],
          [
            "استرداد باز",
            refunds.filter((r) => r.status !== "completed").length,
          ],
          [
            "پرداخت نیازمند بررسی",
            payments.filter((p) => p.status === "needs_attention").length,
          ],
        ].map(([label, count]) => (
          <div className="platform-card" key={label}>
            <p className="text-xs">{label}</p>
            <p className="mt-4 text-3xl font-bold">{number(Number(count))}</p>
          </div>
        ))}
      </div>
      <nav className="mb-8 flex flex-wrap gap-4 text-sm">
        {[
          ["#approvals", "تأیید باشگاه"],
          ["#bookings", "همه رزروها"],
          ["#payments", "پرداخت‌ها"],
          ["#refunds", "استردادها"],
          ["#providers", "اتصال باشگاه"],
          ["#results", "نتایج و اعتراض"],
          ["#profiles", "سطح و سابقه"],
          ["#audit", "گزارش تغییرات"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="min-h-11 rounded-xl border border-border bg-white px-4 py-3"
          >
            {label}
          </a>
        ))}
      </nav>
      <section id="approvals" className="mb-8">
        <h2 className="mb-5 text-xl font-bold">
          درخواست‌های منتظر تأیید واقعی باشگاه
        </h2>
        {pending.map((b) => {
          const slot = slots.find((s) => s.id === b.slot_id),
            court = courts.find((c) => c.id === slot?.court_id);
          return (
            <article className="platform-card my-4" key={b.id}>
              <div className="mb-5 text-sm leading-8">
                <b>{names(b.user_id)}</b> ·{" "}
                {b.kind === "private" ? "خصوصی" : "بازی باز"}
                <p>
                  {clubs.find((c) => c.id === court?.club_id)?.name} ·{" "}
                  {court?.name} · {slot ? moment(slot.starts_at) : ""}
                </p>
                <p>
                  زمین: {money(b.court_price)} · تجهیزات مشترک:{" "}
                  {money(b.shared_price)}
                </p>
              </div>
              <ActionForm
                operation="admin:approve"
                label="ثبت نگه‌داشت باشگاه و فعال‌کردن پرداخت"
                confirm="با ثبت این فرم، تأیید می‌کنید باشگاه واقعاً زمین را تا مهلت اعلام‌شده نگه داشته است."
              >
                <input type="hidden" name="booking_id" value={b.id} />
                <Field
                  name="reference"
                  label="نام مسئول و مرجع تأیید باشگاه"
                  required
                  minLength={2}
                />
                <Field
                  type="datetime-local"
                  name="hold_until"
                  label="اعتبار نگه‌داشت؛ وقت تهران"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  مهلت پرداخت خودکار برابر کمترینِ ۶۰ دقیقه، اعتبار نگه‌داشت و
                  مهلت بازی خواهد بود.
                </p>
              </ActionForm>
            </article>
          );
        })}
        {!pending.length && (
          <p className="platform-card text-sm text-muted-foreground">
            درخواست معطل تأیید ندارید.
          </p>
        )}
      </section>
      <section id="bookings" className="platform-card mb-8">
        <h2>رزروها و اولویت‌های زمانی</h2>
        {bookings
          .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
          .map((b) => (
            <div className="border-t border-border py-4 text-sm" key={b.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <b>
                  {names(b.user_id)} ·{" "}
                  {b.kind === "private"
                    ? "خصوصی"
                    : b.kind === "event"
                      ? "رویداد"
                      : "بازی باز"}
                </b>
                <span className="status-pill">{bookingLabels[b.status]}</span>
              </div>
              {b.hold_expires_at && (
                <p className="mt-3 text-xs">
                  انقضای نگه‌داشت: {moment(b.hold_expires_at)}
                </p>
              )}
              {!["completed", "cancelled", "expired"].includes(b.status) && (
                <details className="mt-4">
                  <summary className="min-h-11 cursor-pointer text-xs">
                    لغو باشگاه / لغو مدیریتی با استرداد کامل
                  </summary>
                  <ActionForm
                    operation="cancel"
                    label="تأیید لغو"
                    confirm="رزرو لغو و برای پرداخت‌های معتبر، درخواست استرداد کامل ثبت می‌شود."
                  >
                    <input name="booking_id" value={b.id} type="hidden" />
                    <Field
                      name="reason"
                      label="علت لغو"
                      minLength={2}
                      required
                    />
                  </ActionForm>
                </details>
              )}
            </div>
          ))}
      </section>
      <section id="payments" className="platform-card mb-8">
        <h2>پرداخت‌ها؛ تأیید فقط از بانک</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          درخواست دارای نتیجه نامعلوم را دوباره به بانک ارسال نکنید. پرداخت بدون
          تأیید بانکی از این پنل قابل قطعی‌کردن نیست.
        </p>
        {payments.map((p) => (
          <div key={p.id} className="border-t border-border py-4">
            <p className="text-sm">
              {names(p.user_id)} · {money(p.amount)} · {bookingLabels[p.status]}
            </p>
            <p className="mt-2 text-xs">
              <bdi>{p.id}</bdi>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              مرجع: <bdi>{p.reference ?? "ثبت نشده"}</bdi>
            </p>
            {p.authority && p.status !== "paid" && (
              <div className="mt-4 max-w-xs">
                <ActionForm
                  action={retryVerifyPayment}
                  label="تأیید مجدد از بانک"
                >
                  <input name="payment_id" value={p.id} type="hidden" />
                </ActionForm>
              </div>
            )}
          </div>
        ))}
      </section>
      <section id="refunds" className="platform-card mb-8">
        <h2>استردادها</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          ثبت درخواست استرداد به معنی انجام آن نیست. پس از انجام واقعی از پنل
          مالی یا بانک، مرجع انتقال را ثبت کنید.
        </p>
        {refunds.map((r) => (
          <article key={r.id} className="my-5 border-t border-border pt-5">
            <p className="text-sm">
              {money(r.amount)} · {r.reason} · {bookingLabels[r.status]}
            </p>
            {r.status !== "completed" ? (
              <ActionForm
                operation="admin:refund"
                label="ثبت انجام واقعی استرداد"
                confirm="تأیید می‌کنید وجه واقعاً مسترد شده و مرجع بانکی صحیح است."
              >
                <input name="refund_id" value={r.id} type="hidden" />
                <Field
                  name="reference"
                  label="مرجع بانکی استرداد"
                  required
                  minLength={3}
                />
              </ActionForm>
            ) : (
              <p className="mt-3 text-xs">
                مرجع: <bdi>{r.provider_reference}</bdi>
              </p>
            )}
          </article>
        ))}
      </section>
      <section id="providers" className="platform-card mb-8">
        <h2>تلاش‌های رزرو خارجی</h2>
        {attempts.map((a) => (
          <div className="border-t border-border py-4 text-sm" key={a.id}>
            <p>
              {bookingLabels[a.status]} ·{" "}
              {a.operation === "confirm"
                ? "رزرو"
                : a.operation === "quote_hold"
                  ? "قیمت و نگه‌داشت"
                  : "لغو"}{" "}
              · تلاش {number(a.attempts)}
            </p>
            <p className="mt-2 text-xs text-red-700">
              {a.last_error
                ? "اتصال نیازمند بررسی است؛ گزارش امن سرور را ببینید."
                : ""}
            </p>
            {a.status === "unknown" && a.attempts < 5 && (
              <ActionForm
                operation="admin:retry-provider"
                label="استعلام و تلاش دوباره"
                confirm="ابتدا وضعیت سفارش قبلی از ارائه‌دهنده استعلام می‌شود."
              >
                <input type="hidden" name="attempt_id" value={a.id} />
              </ActionForm>
            )}
          </div>
        ))}
        {!attempts.length && (
          <p className="text-sm text-muted-foreground">
            هیچ تلاش خارجی ثبت نشده است. آداپتر بدون پیکربندی معتبر فعال
            نمی‌شود.
          </p>
        )}
      </section>
      <section id="results" className="platform-card mb-8">
        <h2>نتایج و اعتراض‌ها</h2>
        {results.map((r) => (
          <article key={r.id} className="my-5 border-t border-border pt-4">
            <p className="text-sm">
              {r.team1_sets} — {r.team2_sets} · {bookingLabels[r.status]} ·{" "}
              {r.competitive ? "درخواست رقابتی" : "دوستانه"}
            </p>
            <ActionForm
              operation="admin:resolve-result"
              label="ثبت تصمیم مدیر"
              confirm="تصمیم شما در گزارش تغییرات ذخیره خواهد شد."
            >
              <input name="result_id" value={r.id} type="hidden" />
              <label className="field">
                تصمیم
                <select name="decision">
                  <option value="accept">تأیید نتیجه</option>
                  <option value="reject">رد نتیجه</option>
                </select>
              </label>
              <Field name="reason" label="علت تصمیم" required minLength={3} />
              {r.competitive && (
                <details className="rounded-xl border border-border p-4">
                  <summary className="min-h-11 cursor-pointer text-sm">
                    اصلاح اختیاری ریتینگ رقابتی
                  </summary>
                  <p className="mb-4 text-xs leading-7 text-muted-foreground">
                    فقط پس از تأیید هر دو تیم و سطح هر چهار نفر. فیلد خالی یعنی
                    بدون تغییر؛ هر نتیجه تنها یک بار در تاریخچه ریتینگ اثر دارد.
                  </p>
                  {[...r.team1_users, ...r.team2_users].map((uid) => (
                    <Field
                      key={uid}
                      name={`rating_${uid}`}
                      label={
                        profiles.find((p) => p.user_id === uid)?.display_name ??
                        "بازیکن"
                      }
                      type="number"
                      min={0}
                      max={10000}
                    />
                  ))}
                </details>
              )}
            </ActionForm>
          </article>
        ))}
      </section>
      <section id="profiles" className="platform-card mb-8">
        <h2>تأیید سطح و اتصال سابقه تاریخی</h2>
        <p className="mb-5 text-xs leading-7 text-muted-foreground">
          اتصال خودکار بر اساس نام یا شماره انجام نمی‌شود. پس از احراز هویت
          بازیکن، سابقه قدیمی را انتخاب کنید؛ داده قبلی حفظ می‌شود.
        </p>
        {profiles.map((p) => (
          <details key={p.user_id} className="border-t border-border py-4">
            <summary className="min-h-11 cursor-pointer text-sm font-medium">
              {p.display_name}
            </summary>
            <div className="grid gap-5 py-5 md:grid-cols-2">
              <ActionForm
                operation="admin:verify-skill"
                label="ذخیره تأیید سطح"
              >
                <input type="hidden" name="user_id" value={p.user_id} />
                <CheckField
                  name="verified"
                  label="سطح بررسی و تأیید شده است"
                  checked={p.skill_verified}
                />
              </ActionForm>
              <ActionForm
                operation="admin:link-player"
                label="اتصال سابقه بازیکن"
                confirm="هویت بازیکن و ارتباط با حساب را بررسی کرده‌اید؟"
              >
                <input type="hidden" name="user_id" value={p.user_id} />
                <SelectField
                  label="بازیکن تاریخی"
                  name="player_id"
                  value={p.player_id ?? ""}
                  options={players.map((p) => ({
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                  }))}
                />
              </ActionForm>
            </div>
          </details>
        ))}
      </section>
      <section id="audit" className="platform-card">
        <h2>گزارش تغییرات اخیر</h2>
        {audit
          .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 100)
          .map((a) => (
            <p
              className="border-t border-border py-3 text-xs leading-7"
              key={a.id}
            >
              {moment(a.created_at)} ·{" "}
              {a.actor_id ? names(a.actor_id) : "پردازش امن سرور"} ·{" "}
              <bdi>
                {a.entity} / {a.operation}
              </bdi>
            </p>
          ))}
        <Link href="/admin/events" className="mt-5 block text-sm underline">
          مدیریت رویدادها
        </Link>
      </section>
    </>
  );
}
import { requestTime } from "@/lib/platform/request-time";
