import Link from "next/link";
import { requireMember } from "@/lib/platform/data";
import { PublicShell } from "@/components/platform/public-shell";
import { logout } from "@/app/actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "حساب من",
  robots: { index: false, follow: false },
};
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const m = await requireMember();
  return (
    <PublicShell>
      <div className="public-container pt-6">
        <nav aria-label="حساب من" className="account-nav">
          <Link href="/account">خانه حساب</Link>
          <Link href="/account/profile">پروفایل</Link>
          <Link href="/account/bookings">رزرو و بازی‌ها</Link>
          <Link href="/account/events">رویدادها</Link>
          <Link href="/account/payments">پرداخت و استرداد</Link>
          <Link href="/account/results">نتایج و اعتراض‌ها</Link>
          <Link href="/account/notifications">اعلان‌ها</Link>
          {m.admin && <Link href="/admin">مدیریت</Link>}
          <form action={logout}>
            <button className="min-h-11 px-3 text-sm text-red-700">
              خروج از حساب
            </button>
          </form>
        </nav>
      </div>
      {children}
    </PublicShell>
  );
}
