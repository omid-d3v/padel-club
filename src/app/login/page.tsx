import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthMethods } from "@/components/platform/auth-methods";
import { AuthPage } from "@/components/platform/auth-page";
import { configured } from "@/lib/supabase/server";
import { member, publicRows } from "@/lib/platform/data";
import { safeNext } from "@/lib/platform/format";
import { authDestination } from "@/lib/auth-flow";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "ورود به مچ شو",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (!configured()) redirect("/setup");
  const [{ error, next }, m, cities] = await Promise.all([
    searchParams,
    member(),
    publicRows("cities"),
  ]);
  if (m?.profile && error !== "admin") redirect(authDestination(next, m.admin));
  const returnTo = next ? safeNext(next) : undefined;
  return (
    <AuthPage
      title="زمین آماده است."
      description="با شماره موبایل وارد شو؛ کد یک‌بارمصرف یا رمز، انتخاب با توست."
    >
      {error === "admin" && (
        <p role="alert" className="auth-message is-error">
          این حساب دسترسی مدیریت ندارد؛ با حساب مدیر وارد شوید.
        </p>
      )}
      <AuthMethods
        phoneEnabled={process.env.PHONE_AUTH_ENABLED === "true"}
        next={returnTo}
        cities={cities.rows.map(({ id, name }) => ({ id, name }))}
        initialProfileRequired={!!m && !m.profile}
      />
      <p className="auth-switch">
        تازه به بازی می‌پیوندی؟{" "}
        <Link
          href={`/register${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`}
        >
          ساخت حساب
        </Link>
      </p>
    </AuthPage>
  );
}
