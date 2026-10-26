import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { operationsSummary } from "@/lib/platform/admin-data";
import { number } from "@/lib/utils";
export default async function Dashboard() {
  const s = await operationsSummary();
  const actions = [
    {
      label: "رزرو نیازمند اقدام",
      value: s.queue,
      href: "/admin/operations?tab=queue",
    },
    {
      label: "رسید منتظر بررسی",
      value: s.receipts,
      href: "/admin/payments?state=pending",
    },
    {
      label: "درخواست پیگیری باز",
      value: s.support,
      href: "/admin/support?state=open",
    },
    {
      label: "استرداد باز",
      value: s.refunds,
      href: "/admin/operations?tab=refunds",
    },
    {
      label: "پرداخت نیازمند بررسی",
      value: s.attention,
      href: "/admin/operations?tab=payments&state=needs_attention",
    },
    {
      label: "نگه‌داشت رو به پایان",
      value: s.expiring,
      href: "/admin/operations?tab=bookings&urgent=1",
    },
  ];
  return (
    <>
      <PageHeader
        title="کارهای امروز باشگاه"
        description="درخواست‌های منتظر را بررسی کنید؛ هر کارت به فهرست مرتبط باز می‌شود."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            className="platform-card flex min-h-32 items-center justify-between gap-4"
            href={a.href}
          >
            <h2>{a.label}</h2>
            <strong className="text-3xl">{number(a.value)}</strong>
          </Link>
        ))}
      </div>
      <section className="platform-card mt-8">
        <h2>مدیریت برنامهٔ باشگاه</h2>
        <div className="mt-5 flex flex-wrap gap-6">
          {[
            ["/admin/clubs?view=calendar", "سانس‌ها و برنامهٔ هفتگی"],
            ["/admin/events", "رویدادها و رقابت‌ها"],
            ["/tournaments", "مسابقات امریکانو"],
            ["/players", "بازیکنان مسابقات"],
            ["/admin/operations?tab=profiles", "حساب‌های بازیکنان"],
          ].map(([href, label]) => (
            <Link className="min-h-11 underline" key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
