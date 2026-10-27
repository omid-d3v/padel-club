import Link from "next/link";
import {
  CalendarClock,
  CircleDollarSign,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Countdown } from "@/components/platform/countdown";
import { adminRows, operationsSummary } from "@/lib/platform/admin-data";
import { PageHeader } from "@/components/shared";
import { ActionForm } from "@/components/platform/action-form";
import { Field, CheckField, SelectField } from "@/components/platform/fields";
import {
  AdminList,
  type AdminListItem,
} from "@/components/platform/admin-list";
import { DetailPanel } from "@/components/platform/detail-panel";
import { ReceiptReview } from "@/components/platform/receipt-review";
import { money, moment, bookingLabels } from "@/lib/platform/format";
import { retryVerifyPayment } from "@/app/payment-actions";
import { number } from "@/lib/utils";
import { tehranDateTime } from "@/lib/date-time";
import { requestTime } from "@/lib/platform/request-time";
import {
  BookingFulfillment,
  fulfillmentLabels,
} from "@/components/platform/booking-fulfillment";

const sections = [
  ["receipts", "رسیدهای کارت‌به‌کارت"],
  ["queue", "صف اقدام رزرو"],
  ["bookings", "رزروها"],
  ["payments", "پرداخت‌ها"],
  ["refunds", "استردادها"],
  ["discounts", "کدهای تخفیف"],
  ["providers", "اتصال باشگاه"],
  ["results", "نتایج و اعتراض"],
  ["profiles", "حساب‌های بازیکنان"],
  ["audit", "گزارش تغییرات"],
] as const;
export default async function Operations({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; urgent?: string }>;
}) {
  const [q, summary] = await Promise.all([searchParams, operationsSummary()]);
  const tab = sections.some(([id]) => id === q.tab) ? q.tab : "queue";
  const need = (...tabs: string[]) => tabs.includes(tab ?? "queue");
  const [
    now,
    bookings,
    participants,
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
    codes,
  ] = await Promise.all([
    requestTime(),
    need(
      "bookings",
      "queue",
      "receipts",
      "payments",
      "refunds",
      "providers",
      "results",
    )
      ? adminRows("bookings")
      : Promise.resolve([]),
    need("bookings", "queue", "receipts", "payments", "refunds")
      ? adminRows("booking_participants")
      : Promise.resolve([]),
    need("bookings", "queue", "receipts", "providers")
      ? adminRows("court_slots")
      : Promise.resolve([]),
    need("bookings", "queue", "receipts", "providers")
      ? adminRows("courts")
      : Promise.resolve([]),
    need("bookings", "queue", "receipts", "providers")
      ? adminRows("clubs")
      : Promise.resolve([]),
    need(
      "bookings",
      "queue",
      "receipts",
      "payments",
      "refunds",
      "profiles",
      "results",
      "audit",
    )
      ? adminRows("user_profiles")
      : Promise.resolve([]),
    need("bookings", "queue", "receipts", "payments", "refunds")
      ? adminRows("payments")
      : Promise.resolve([]),
    need("bookings", "queue", "payments", "refunds")
      ? adminRows("refunds")
      : Promise.resolve([]),
    need("providers") ? adminRows("provider_attempts") : Promise.resolve([]),
    need("results") ? adminRows("result_submissions") : Promise.resolve([]),
    need("audit") ? adminRows("audit_log") : Promise.resolve([]),
    need("profiles") ? adminRows("players") : Promise.resolve([]),
    need("discounts") ? adminRows("discount_codes") : Promise.resolve([]),
  ]);
  const [proposals, connections, receipts] = await Promise.all([
    need("bookings", "queue", "receipts")
      ? adminRows("booking_reschedules")
      : Promise.resolve([]),
    need("providers", "queue", "bookings")
      ? adminRows("calendar_connections")
      : Promise.resolve([]),
    need("receipts", "payments", "queue")
      ? adminRows("card_transfer_receipts")
      : Promise.resolve([]),
  ]);
  const sourceUrls: Record<string, string> = {
    guilan: "https://guilanpadelclub.ir/booking",
    sabaland: "https://sabalandcomplex.ir/booking/",
    respina: "https://respina.gildev.ir/tennis/book",
  };
  const names = (uid: string) =>
    profiles.find((p) => p.user_id === uid)?.display_name ?? "کاربر";
  const kinds: Record<string, string> = {
    private: "خصوصی",
    open: "بازی باز",
    event: "رویداد",
  };
  const filters = (states: string[]) =>
    [...new Set(states)].map((value) => ({
      value,
      label: bookingLabels[value] ?? value,
    }));
  const bookingItems: AdminListItem[] =
    tab === "bookings" || tab === "queue"
      ? bookings
          .filter(
            (b) =>
              q.urgent !== "1" ||
              (!!b.hold_expires_at &&
                Date.parse(b.hold_expires_at) > now &&
                Date.parse(b.hold_expires_at) < now + 3600000 &&
                ["collecting", "awaiting_payment"].includes(b.status)),
          )
          .filter(
            (b) =>
              tab !== "queue" ||
              (b.mode === "MANUAL_APPROVAL" &&
                (!b.payment_first ||
                  ["booking_in_progress", "needs_attention"].includes(
                    b.status,
                  )) &&
                b.fulfillment_state !== "booked" &&
                !["cancelled", "expired", "completed"].includes(b.status)),
          )
          .toSorted((a, b) =>
            tab === "queue"
              ? Date.parse(a.request_expires_at) -
                Date.parse(b.request_expires_at)
              : b.created_at.localeCompare(a.created_at),
          )
          .map((b) => {
            const slot = slots.find((s) => s.id === b.slot_id);
            const court = courts.find((c) => c.id === slot?.court_id);
            const club = clubs.find((c) => c.id === court?.club_id);
            const seats = participants.filter((p) => p.booking_id === b.id);
            const related = payments.filter((p) =>
              seats.some((s) => s.id === p.participant_id),
            );
            return {
              id: b.id,
              title: `${names(b.user_id)} · ${kinds[b.kind]}`,
              meta: `${club?.name ?? "باشگاه"} · ${court?.name ?? "زمین"} · ${slot ? moment(slot.starts_at) : moment(b.created_at)}${tab === "queue" ? " · مهلت پاسخ: " + moment(b.request_expires_at) : ""}`,
              badge:
                tab === "queue"
                  ? fulfillmentLabels[b.fulfillment_state]
                  : bookingLabels[b.status],
              state: tab === "queue" ? b.fulfillment_state : b.status,
              search: `${b.club_reference ?? ""} ${seats.map((p) => names(p.user_id)).join(" ")}`,
              content: (
                <>
                  <dl className="admin-facts">
                    <div>
                      <dt>وضعیت رزرو</dt>
                      <dd>{bookingLabels[b.status]}</dd>
                    </div>
                    <div>
                      <dt>هزینه زمین</dt>
                      <dd>{money(b.court_price)}</dd>
                    </div>
                    <div>
                      <dt>تجهیزات مشترک</dt>
                      <dd>{money(b.shared_price)}</dd>
                    </div>
                    <div>
                      <dt>تأیید باشگاه</dt>
                      <dd>{b.club_reference ?? "در انتظار بررسی"}</dd>
                    </div>
                  </dl>
                  <BookingFulfillment
                    booking={b}
                    proposals={proposals}
                    currentTime={slot?.starts_at ?? b.created_at}
                    sourceUrl={
                      sourceUrls[
                        connections.find((c) => c.club_id === club?.id)
                          ?.source ?? ""
                      ]
                    }
                    now={now}
                  />
                  <section className="admin-action-block">
                    <h3>بازیکنان و تسویه</h3>
                    {seats.length ? (
                      seats.map((p) => (
                        <div key={p.id} className="admin-seat">
                          <div className="flex flex-wrap justify-between gap-3">
                            <b>{names(p.user_id)}</b>
                            <span>
                              {money(
                                p.court_share +
                                  p.shared_share +
                                  p.personal_price +
                                  p.fee,
                              )}{" "}
                              ·{" "}
                              {p.status === "paid" &&
                              p.court_share +
                                p.shared_share +
                                p.personal_price +
                                p.fee ===
                                0
                                ? "تسویه بدون پرداخت"
                                : bookingLabels[p.status]}
                            </span>
                          </div>
                          {p.status === "reserved" && p.lock_expires_at && (
                            <>
                              <Countdown
                                now={now}
                                deadline={new Date(
                                  Math.min(
                                    Date.parse(p.lock_expires_at),
                                    b.hold_expires_at
                                      ? Date.parse(b.hold_expires_at)
                                      : Infinity,
                                  ),
                                ).toISOString()}
                                label="مهلت این جایگاه"
                              />
                              <details>
                                <summary>
                                  معافیت مانده و رزرو بدون پرداخت
                                </summary>
                                <p className="my-3 text-xs leading-7">
                                  پس از نگه‌داشت معتبر، مانده این سهم با ثبت
                                  دلیل صفر می‌شود. بازی باز به تسویه چهار سهم
                                  نیاز دارد.
                                </p>
                                <ActionForm
                                  operation="admin:waive"
                                  label="صفر کردن مبلغ و تسویه بدون پرداخت"
                                  confirm="تمام مبلغ این سهم معاف و در گزارش مالی ثبت می‌شود. تأیید می‌کنید؟"
                                >
                                  <input
                                    type="hidden"
                                    name="participant_id"
                                    value={p.id}
                                  />
                                  <Field
                                    name="reason"
                                    label="دلیل معافیت"
                                    required
                                    minLength={3}
                                  />
                                </ActionForm>
                              </details>
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        جایگاهی ثبت نشده است.
                      </p>
                    )}
                  </section>
                  <section className="admin-action-block">
                    <h3>پرداخت‌های مرتبط</h3>
                    {related.length ? (
                      related.map((p) => (
                        <div className="admin-seat" key={p.id}>
                          <p>
                            {names(p.user_id)} · {money(p.amount)} ·{" "}
                            {bookingLabels[p.status]}
                          </p>
                          <p className="mt-2 text-xs break-all">
                            مرجع بانکی: <bdi>{p.reference ?? "ثبت نشده"}</bdi>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        تراکنش بانکی ثبت نشده است.
                      </p>
                    )}
                  </section>
                  {!["completed", "cancelled", "expired"].includes(
                    b.status,
                  ) && (
                    <details className="admin-danger-zone">
                      <summary>لغو مدیریتی رزرو</summary>
                      <p className="my-3 text-xs leading-7">
                        برای پرداخت‌های معتبر درخواست استرداد کامل ثبت می‌شود؛
                        انجام استرداد جداگانه پیگیری خواهد شد.
                      </p>
                      <ActionForm
                        operation="cancel"
                        label="تأیید لغو"
                        confirm="رزرو لغو و برای پرداخت‌های معتبر، درخواست استرداد کامل ثبت می‌شود."
                      >
                        <input type="hidden" name="booking_id" value={b.id} />
                        <Field
                          name="reason"
                          label="علت لغو"
                          minLength={2}
                          required
                        />
                      </ActionForm>
                    </details>
                  )}
                </>
              ),
            };
          })
      : [];
  let otherItems: AdminListItem[] = [];
  if (tab === "receipts")
    otherItems = receipts
      .filter((r) => r.status !== "draft")
      .toSorted(
        (a, b) =>
          Number(b.status === "pending") - Number(a.status === "pending") ||
          (b.submitted_at ?? b.created_at).localeCompare(
            a.submitted_at ?? a.created_at,
          ),
      )
      .map((r) => ({
        id: r.id,
        title: names(r.user_id),
        meta: `${money(payments.find((p) => p.id === r.payment_id)?.amount ?? 0)} · ${moment(r.submitted_at ?? r.created_at)}`,
        badge: {
          pending: "در انتظار بررسی",
          approved: "واریز تأیید شد",
          rejected: "رسید رد شد",
          draft: "آماده واریز",
        }[r.status],
        state: r.status,
        content: <ReceiptReview receipt={r} />,
      }));
  if (tab === "payments")
    otherItems = payments
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => ({
        id: p.id,
        title: names(p.user_id),
        meta: `${money(p.amount)} · ${moment(p.created_at)}`,
        badge: bookingLabels[p.status],
        state: p.status,
        content: (
          <>
            <dl className="admin-facts">
              <div>
                <dt>مبلغ</dt>
                <dd>{money(p.amount)}</dd>
              </div>
              <div>
                <dt>مرجع بانکی</dt>
                <dd>
                  <bdi>{p.reference ?? "ثبت نشده"}</bdi>
                </dd>
              </div>
            </dl>
            <p className="my-5 text-sm leading-7">
              تأیید فقط از بانک انجام می‌شود. نتیجه نامعلوم را به‌عنوان پرداخت
              موفق ثبت نکنید.
            </p>
            {p.authority && p.status !== "paid" && (
              <ActionForm
                action={retryVerifyPayment}
                label="تأیید مجدد از بانک"
              >
                <input type="hidden" name="payment_id" value={p.id} />
              </ActionForm>
            )}
          </>
        ),
      }));
  if (tab === "refunds")
    otherItems = refunds.map((r) => ({
      id: r.id,
      title: money(r.amount),
      meta: r.reason,
      badge: bookingLabels[r.status],
      state: r.status,
      content: (
        <>
          <p className="mb-5 text-sm leading-7">
            پس از انجام واقعی استرداد، مرجع انتقال بانکی را ثبت کنید.
          </p>
          {r.status !== "completed" ? (
            <ActionForm
              operation="admin:refund"
              label="ثبت انجام واقعی استرداد"
              confirm="تأیید می‌کنید وجه واقعاً مسترد شده و مرجع بانکی صحیح است."
            >
              <input type="hidden" name="refund_id" value={r.id} />
              <Field
                name="reference"
                label="مرجع بانکی استرداد"
                required
                minLength={3}
              />
            </ActionForm>
          ) : (
            <p>
              مرجع: <bdi>{r.provider_reference}</bdi>
            </p>
          )}
        </>
      ),
    }));
  if (tab === "discounts")
    otherItems = codes.map((c) => ({
      id: c.id,
      title: c.code,
      meta: `${c.kind === "percent" ? number(c.value) + "٪" : money(c.value)} · انقضا ${moment(c.expires_at)} · سقف ${number(c.max_uses)} بار`,
      badge: c.active ? "فعال" : "غیرفعال",
      state: c.active ? "active" : "disabled",
      content: (
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
            defaultValue={tehranDateTime(new Date(c.expires_at))}
          />
          <CheckField name="active" label="فعال بماند" checked={c.active} />
        </ActionForm>
      ),
    }));
  if (tab === "providers")
    otherItems = attempts.map((a) => ({
      id: a.id,
      title:
        a.operation === "confirm"
          ? "رزرو"
          : a.operation === "quote_hold"
            ? "قیمت و نگه‌داشت"
            : "لغو",
      meta: `تلاش ${number(a.attempts)} · رزرو ${a.booking_id.slice(0, 8)}`,
      badge: bookingLabels[a.status],
      state: a.status,
      content: (
        <>
          {a.last_error && (
            <p className="mb-5 text-sm text-red-700">
              اتصال نیازمند بررسی است؛ گزارش امن سرور را ببینید.
            </p>
          )}
          {a.status === "unknown" && a.attempts < 5 && (
            <ActionForm
              operation="admin:retry-provider"
              label="استعلام و تلاش دوباره"
              confirm="ابتدا وضعیت سفارش قبلی از ارائه‌دهنده استعلام می‌شود."
            >
              <input type="hidden" name="attempt_id" value={a.id} />
            </ActionForm>
          )}
        </>
      ),
    }));
  if (tab === "results")
    otherItems = results.map((r) => ({
      id: r.id,
      title: `${number(r.team1_sets)} — ${number(r.team2_sets)}`,
      meta: `${r.competitive ? "درخواست رقابتی" : "دوستانه"} · ${[...r.team1_users, ...r.team2_users].map(names).join("، ")}`,
      badge: bookingLabels[r.status],
      state: r.status,
      content: (
        <ActionForm
          operation="admin:resolve-result"
          label="ثبت تصمیم مدیر"
          confirm="تصمیم شما در گزارش تغییرات ذخیره خواهد شد."
        >
          <input type="hidden" name="result_id" value={r.id} />
          <label className="field">
            تصمیم
            <select name="decision">
              <option value="accept">تأیید نتیجه</option>
              <option value="reject">رد نتیجه</option>
            </select>
          </label>
          <Field name="reason" label="علت تصمیم" required minLength={3} />
          {r.competitive && (
            <details>
              <summary>اصلاح اختیاری ریتینگ رقابتی</summary>
              <p className="my-4 text-xs leading-7">
                فقط پس از تأیید هر دو تیم و سطح هر چهار نفر. فیلد خالی یعنی بدون
                تغییر؛ هر نتیجه تنها یک بار در تاریخچه اثر دارد.
              </p>
              {[...r.team1_users, ...r.team2_users].map((uid) => (
                <Field
                  key={uid}
                  name={`rating_${uid}`}
                  label={names(uid)}
                  type="number"
                  min={0}
                  max={10000}
                />
              ))}
            </details>
          )}
        </ActionForm>
      ),
    }));
  if (tab === "profiles")
    otherItems = profiles.map((p) => ({
      id: p.user_id,
      title: p.display_name,
      meta: p.skill_verified ? "سطح تأییدشده" : "نیازمند بررسی سطح",
      content: (
        <div className="space-y-6">
          <ActionForm operation="admin:verify-skill" label="ذخیره تأیید سطح">
            <input type="hidden" name="user_id" value={p.user_id} />
            <CheckField
              name="verified"
              label="سطح بررسی و تأیید شده است"
              checked={p.skill_verified}
            />
          </ActionForm>
          <section className="admin-action-block">
            <h3>اتصال سابقه تاریخی</h3>
            <p className="mb-4 text-xs leading-7">
              ابتدا هویت بازیکن را بررسی کنید؛ اتصال بر اساس تشابه نام انجام
              نمی‌شود.
            </p>
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
          </section>
        </div>
      ),
    }));
  if (tab === "audit")
    otherItems = audit
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
      .map((a) => ({
        id: a.id,
        title: a.actor_id ? names(a.actor_id) : "پردازش امن سرور",
        meta: moment(a.created_at),
        badge: a.operation,
        search: a.entity + " " + a.entity_id,
        content: (
          <>
            <p className="mb-4 text-sm">
              شناسهٔ رکورد: <bdi>{a.entity_id}</bdi>
            </p>
            {(
              {
                bookings: "bookings",
                payments: "payments",
                refunds: "refunds",
                result_submissions: "results",
                user_profiles: "profiles",
              } as Record<string, string>
            )[a.entity] && (
              <Link
                className="mb-4 inline-flex min-h-11 items-center underline"
                href={`/admin/operations?tab=${({ bookings: "bookings", payments: "payments", refunds: "refunds", result_submissions: "results", user_profiles: "profiles" } as Record<string, string>)[a.entity]}&record=${encodeURIComponent(a.entity_id)}`}
              >
                بازکردن پروندهٔ مرتبط
              </Link>
            )}
            <dl className="admin-facts">
              <div>
                <dt>موجودیت</dt>
                <dd>
                  <bdi>{a.entity}</bdi>
                </dd>
              </div>
              <div>
                <dt>عملیات</dt>
                <dd>
                  <bdi>{a.operation}</bdi>
                </dd>
              </div>
              <div>
                <dt>زمان</dt>
                <dd>{moment(a.created_at)}</dd>
              </div>
            </dl>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["پیش از تغییر", a.before_data],
                ["پس از تغییر", a.after_data],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <h3 className="my-3 font-bold">{String(label)}</h3>
                  <pre
                    dir="ltr"
                    className="max-h-80 overflow-auto rounded-xl bg-muted p-3 text-xs whitespace-pre-wrap break-all"
                  >
                    {value ? JSON.stringify(value, null, 2) : "—"}
                  </pre>
                </div>
              ))}
            </div>
          </>
        ),
      }));
  const title = sections.find(([id]) => id === tab)?.[1] ?? "رزروها";
  const createCode = (
    <DetailPanel title="کد تخفیف جدید" label="ساخت کد تخفیف">
      <ActionForm
        operation="admin:discount"
        label="ساخت کد تخفیف"
        className="grid gap-4 sm:grid-cols-2"
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
    </DetailPanel>
  );
  return (
    <>
      <PageHeader
        title={
          tab === "receipts"
            ? "بررسی واریزهای کارت‌به‌کارت"
            : "اتاق عملیات باشگاه"
        }
        description={
          tab === "receipts"
            ? "رسیدهای در انتظار بررسی در ابتدای فهرست‌اند. جزئیات را باز کنید، تصویر و مبلغ را با حساب تطبیق دهید و واریز را تأیید یا با ذکر علت رد کنید."
            : "هر رزرو، یک پرونده روشن؛ بررسی وضعیت و انجام عملیات از پنجره جزئیات."
        }
      />
      <div className="admin-overview">
        {tab === "receipts" && (
          <div className="admin-kpi">
            <CircleDollarSign size={21} />
            <span>رسید منتظر بررسی</span>
            <strong>{number(summary.receipts)}</strong>
          </div>
        )}
        {[
          {
            label: "در انتظار باشگاه",
            value: summary.pending,
            Icon: CalendarClock,
          },
          {
            label: "نگه‌داشت رو به پایان",
            value: summary.expiring,
            Icon: CircleDollarSign,
          },
          {
            label: "استرداد باز",
            value: summary.refunds,
            Icon: RotateCcw,
          },
          {
            label: "پرداخت نیازمند بررسی",
            value: summary.attention,
            Icon: ShieldAlert,
          },
        ].map(({ label, value, Icon }) => (
          <Link
            className="admin-kpi"
            key={label}
            href={
              label === "استرداد باز"
                ? "/admin/operations?tab=refunds"
                : label === "پرداخت نیازمند بررسی"
                  ? "/admin/operations?tab=payments&state=needs_attention"
                  : label === "نگه‌داشت رو به پایان"
                    ? "/admin/operations?tab=bookings&urgent=1"
                    : "/admin/operations?tab=bookings&state=pending_club"
            }
          >
            <Icon size={21} />
            <span>{label}</span>
            <strong>{number(value)}</strong>
          </Link>
        ))}
      </div>
      {q.urgent === "1" && (
        <p className="my-4 text-sm">
          فقط نگه‌داشت‌های رو به پایان نمایش داده می‌شود.{" "}
          <Link className="underline" href="/admin/operations?tab=bookings">
            نمایش همهٔ رزروها
          </Link>
        </p>
      )}
      <nav aria-label="بخش‌های عملیات" className="admin-tabs">
        {sections.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/operations?tab=${id}`}
            aria-current={tab === id ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "bookings" || tab === "queue" ? (
        <AdminList
          key="bookings"
          title={
            tab === "queue" ? "رزروهایی که منتظر اقدام شما هستند" : "رزروها"
          }
          description={
            tab === "queue"
              ? "درخواست را بررسی کنید، زمین را در سایت باشگاه رزرو کنید و مرجع را ثبت کنید؛ اگر زمان آزاد نبود، از تقویم همان زمین پیشنهاد جایگزین بفرستید."
              : "جست‌وجو با نام بازیکن، باشگاه، زمین یا شناسه رزرو. جزئیات همان رزرو را باز کنید."
          }
          items={bookingItems}
          filters={
            tab === "queue"
              ? Object.entries(fulfillmentLabels).map(([value, label]) => ({
                  value,
                  label,
                }))
              : filters(bookings.map((b) => b.status))
          }
        />
      ) : (
        <AdminList
          key={tab}
          title={title}
          items={otherItems}
          filters={
            tab === "receipts"
              ? [
                  { value: "pending", label: "در انتظار بررسی" },
                  { value: "approved", label: "تأییدشده" },
                  { value: "rejected", label: "ردشده" },
                ]
              : tab === "discounts"
                ? [
                    { value: "active", label: "فعال" },
                    { value: "disabled", label: "غیرفعال" },
                  ]
                : filters(otherItems.flatMap((i) => (i.state ? [i.state] : [])))
          }
          toolbar={tab === "discounts" ? createCode : undefined}
        />
      )}
    </>
  );
}
