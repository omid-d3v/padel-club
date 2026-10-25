import Link from "next/link";
import { AuthPage } from "@/components/platform/auth-page";
import { AuthMethods } from "@/components/platform/auth-methods";
import { publicRows } from "@/lib/platform/data";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "بازیابی رمز با موبایل",
  robots: { index: false },
};
export default async function Forgot({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, cities] = await Promise.all([
    searchParams,
    publicRows("cities"),
  ]);
  return (
    <AuthPage
      title="برگرد به بازی."
      description="شماره موبایل حسابت را با پیامک تأیید کن، سپس رمز تازه بساز."
    >
      <AuthMethods
        recovery
        next={next}
        cities={cities.rows.map(({ id, name }) => ({ id, name }))}
        phoneEnabled={process.env.PHONE_AUTH_ENABLED === "true"}
      />
      <p className="auth-switch">
        <Link href="/login">بازگشت به ورود</Link>
      </p>
    </AuthPage>
  );
}
