import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthMethods } from "@/components/platform/auth-methods";
import { AuthPage } from "@/components/platform/auth-page";
import { member, publicRows } from "@/lib/platform/data";
import { safeNext } from "@/lib/platform/format";
import { authDestination } from "@/lib/auth-flow";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "عضویت در مچ شو",
  robots: { index: false, follow: false },
};
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, m, cities] = await Promise.all([
    searchParams,
    member(),
    publicRows("cities"),
  ]);
  if (m?.profile) redirect(authDestination(next, m.admin));
  const returnTo = next ? safeNext(next) : undefined;
  return (
    <AuthPage
      title="جای تو روی زمین خالی است."
      description="شماره‌ات را تأیید کن، اطلاعات بازی‌ات را همین‌جا تکمیل کن و بعد راهی زمین شو."
    >
      <AuthMethods
        signup
        phoneEnabled={process.env.PHONE_AUTH_ENABLED === "true"}
        next={returnTo}
        cities={cities.rows.map(({ id, name }) => ({ id, name }))}
        initialProfileRequired={!!m && !m.profile}
      />
      <p className="auth-switch">
        قبلاً عضو شده‌ای؟{" "}
        <Link
          href={`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`}
        >
          ورود به حساب
        </Link>
      </p>
    </AuthPage>
  );
}
