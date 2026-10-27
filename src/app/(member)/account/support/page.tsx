import { requireMember } from "@/lib/platform/data";
import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
import { moment } from "@/lib/platform/format";
import { z } from "zod";
export default async function Support({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; payment?: string; event?: string }>;
}) {
  const [m, q] = await Promise.all([requireMember(), searchParams]);
  const { data: requests, error } = await m.db
    .from("support_requests")
    .select("*")
    .eq("user_id", m.userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("دریافت درخواست‌های پشتیبانی انجام نشد.");
  const valid = (v?: string) => (z.uuid().safeParse(v).success ? v : "");
  return (
    <section className="public-container public-page">
      <h1>پیگیری و پشتیبانی</h1>
      <p className="intro">
        مشکل رزرو، پرداخت، سطح بازی یا اطلاعات حساب را اینجا ثبت کن. پاسخ مسئول
        پشتیبانی در همین صفحه و اعلان‌های حسابت نمایش داده می‌شود. رمز، اطلاعات
        ورود بانکی یا تصویر حساس ارسال نکن.
      </p>
      <div className="platform-card my-6 max-w-2xl">
        <h2>درخواست تازه</h2>
        <ActionForm
          operation="support"
          label="ثبت درخواست پیگیری"
          buttonVariant="default"
        >
          <input type="hidden" name="request_key" value={crypto.randomUUID()} />
          <input type="hidden" name="booking_id" value={valid(q.booking)} />
          <input type="hidden" name="payment_id" value={valid(q.payment)} />
          <input type="hidden" name="event_id" value={valid(q.event)} />
          {(q.booking || q.payment || q.event) && (
            <p className="text-sm">
              این درخواست به سفارش انتخاب‌شده متصل می‌شود؛ دسترسی به سفارش هنگام
              ثبت بررسی خواهد شد.
            </p>
          )}
          <Field
            name="subject"
            label="موضوع"
            required
            minLength={3}
            maxLength={120}
          />
          <label className="field">
            چه اتفاقی افتاده و چه کمکی نیاز داری؟
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={3000}
              rows={5}
              className="platform-textarea"
            />
          </label>
        </ActionForm>
      </div>
      <h2>درخواست‌های تو</h2>
      {requests?.map((r) => (
        <article
          id={`request-${r.id}`}
          key={r.id}
          className="platform-card my-5"
        >
          <h3 className="font-bold">{r.subject}</h3>
          <p className="my-3 text-sm">
            {r.status === "open" ? "در صف پاسخ پشتیبانی" : "پاسخ ثبت شد"} ·{" "}
            {moment(r.created_at)}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-8">{r.body}</p>
          {r.reply && (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4">
              <b>پاسخ پشتیبانی</b>
              <p className="whitespace-pre-wrap text-sm leading-8">{r.reply}</p>
              {r.replied_at && (
                <p className="text-xs">{moment(r.replied_at)}</p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs">
            شناسهٔ پیگیری: <bdi>{r.id}</bdi>
          </p>
        </article>
      ))}
      {!requests?.length && <p className="mt-5">هنوز درخواستی ثبت نکرده‌ای.</p>}
    </section>
  );
}
