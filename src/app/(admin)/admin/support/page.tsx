import Link from "next/link";
import { adminRows } from "@/lib/platform/admin-data";
import { AdminList } from "@/components/platform/admin-list";
import { ActionForm } from "@/components/platform/action-form";
import { moment } from "@/lib/platform/format";
export default async function Support() {
  const [rows, profiles] = await Promise.all([
    adminRows("support_requests"),
    adminRows("user_profiles"),
  ]);
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">پیگیری درخواست‌های کاربران</h1>
      <p className="mb-6 text-sm">
        درخواست‌های باز، از قدیمی‌ترین در ابتدای صف هستند. پاسخ در حساب کاربر و
        اعلان‌های او ثبت می‌شود.
      </p>
      <AdminList
        title="درخواست‌های پشتیبانی"
        filters={[
          { value: "open", label: "منتظر پاسخ" },
          { value: "answered", label: "پاسخ‌داده‌شده" },
        ]}
        items={rows
          .toSorted(
            (a, b) =>
              Number(b.status === "open") - Number(a.status === "open") ||
              a.created_at.localeCompare(b.created_at),
          )
          .map((r) => ({
            id: r.id,
            title: r.subject,
            meta:
              (profiles.find((p) => p.user_id === r.user_id)?.display_name ??
                "کاربر") +
              " · " +
              moment(r.created_at),
            state: r.status,
            badge: r.status === "open" ? "منتظر پاسخ" : "پاسخ ثبت شد",
            content: (
              <div className="space-y-5">
                <p className="whitespace-pre-wrap leading-8">{r.body}</p>
                {r.booking_id && (
                  <Link
                    className="block underline"
                    href={`/admin/operations?tab=bookings&record=${r.booking_id}`}
                  >
                    پروندهٔ رزرو
                  </Link>
                )}
                {r.payment_id && (
                  <Link
                    className="block underline"
                    href={`/admin/operations?tab=payments&record=${r.payment_id}`}
                  >
                    پروندهٔ پرداخت
                  </Link>
                )}
                {r.event_id && (
                  <Link
                    className="block underline"
                    href={`/admin/events?record=${r.event_id}`}
                  >
                    رویداد مرتبط
                  </Link>
                )}
                <ActionForm
                  operation="admin:support-reply"
                  label="ثبت پاسخ و اطلاع به کاربر"
                >
                  <input type="hidden" name="request_id" value={r.id} />
                  <label className="field">
                    پاسخ قابل نمایش به کاربر
                    <textarea
                      className="platform-textarea"
                      name="reply"
                      required
                      minLength={3}
                      maxLength={3000}
                      rows={5}
                      defaultValue={r.reply ?? ""}
                    />
                  </label>
                </ActionForm>
              </div>
            ),
          }))}
      />
    </section>
  );
}
