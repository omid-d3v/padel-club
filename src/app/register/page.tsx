import Link from "next/link";
import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
import { registerAccount } from "@/app/platform-actions";
import { AuthMethods } from "@/components/platform/auth-methods";
import { safeNext } from "@/lib/platform/format";
export const metadata = {
  title: "عضویت در مچ شو",
  robots: { index: false },
};
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: requested } = await searchParams;
  const next = safeNext(requested, "/account/profile");
  return (
    <main
      id="main"
      className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-6 py-12"
    >
      <Link href="/" className="text-xl font-extrabold">
        مچ شو ↖
      </Link>
      <h1 className="text-3xl font-extrabold">بازی از عضویت شروع می‌شه.</h1>
      <p className="text-sm leading-7 text-muted-foreground">
        حساب خودت را بساز، سطح بازی را مشخص کن و هم‌بازی پیدا کن.
      </p>
      <AuthMethods
        signup
        next={next}
        phoneEnabled={process.env.PHONE_AUTH_ENABLED === "true"}
      >
        <ActionForm
          action={registerAccount}
          label="ساخت حساب"
          buttonVariant="default"
        >
          <input type="hidden" name="next" value={next} />
          <Field
            label="ایمیل"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
          />
          <Field
            label="رمز عبور؛ حداقل ۱۰ کاراکتر"
            name="password"
            type="password"
            dir="ltr"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <label className="flex items-start gap-3 text-xs leading-7">
            <input type="checkbox" required className="mt-1 size-5" />
            با{" "}
            <Link href="/terms" className="underline">
              قوانین
            </Link>{" "}
            و{" "}
            <Link href="/privacy" className="underline">
              حریم خصوصی
            </Link>{" "}
            موافقم.
          </label>
        </ActionForm>
      </AuthMethods>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="text-sm underline"
      >
        قبلاً عضو شده‌ام
      </Link>
    </main>
  );
}
