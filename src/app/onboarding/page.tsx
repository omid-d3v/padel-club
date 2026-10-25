import { redirect } from "next/navigation";
import { AuthPage } from "@/components/platform/auth-page";
import { AuthMethods } from "@/components/platform/auth-methods";
import { NotificationPhone } from "@/components/platform/notification-phone";
import { requireMember, publicRows } from "@/lib/platform/data";
import { authDestination } from "@/lib/auth-flow";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "تکمیل اطلاعات بازی",
  robots: { index: false, follow: false },
};
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [m, { next }, cities] = await Promise.all([
    requireMember(),
    searchParams,
    publicRows("cities"),
  ]);
  if (m.profile) redirect(authDestination(next, m.admin));
  const {
    data: { user },
  } = await m.db.auth.getUser();
  return (
    <AuthPage
      title="بازی را با شناخت تو شروع کنیم."
      description="اطلاعات بازی‌ات را تکمیل کن تا وارد حساب شوی یا مسیر قبلی را ادامه بدهی."
    >
      {user?.phone_confirmed_at || m.admin ? (
        <AuthMethods
          initialProfileRequired
          initialPhone={user?.phone ?? ""}
          next={next}
          cities={cities.rows.map(({ id, name }) => ({ id, name }))}
          phoneEnabled={process.env.PHONE_AUTH_ENABLED === "true"}
        />
      ) : (
        <NotificationPhone />
      )}
    </AuthPage>
  );
}
