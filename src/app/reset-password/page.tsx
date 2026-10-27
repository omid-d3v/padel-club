import { AuthPage } from "@/components/platform/auth-page";
import Link from "next/link";
import { requireMember } from "@/lib/platform/data";
export const dynamic = "force-dynamic";
import { updatePassword } from "@/app/platform-actions";
import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
export const metadata = { title: "رمز عبور تازه", robots: { index: false } };
export default async function Reset() {
  await requireMember();
  return (
    <AuthPage
      title="رمز تازه را ثبت کنید."
      description="یک رمز قوی انتخاب کنید و آن را با دیگران به اشتراک نگذارید."
    >
      <Link
        href="/account/profile"
        className="inline-flex min-h-11 items-center underline"
      >
        بازگشت به پروفایل و تنظیمات حساب
      </Link>
      <ActionForm action={updatePassword} label="ذخیره رمز جدید">
        <Field
          label="رمز جدید؛ حداقل ۱۰ کاراکتر"
          name="password"
          type="password"
          required
          dir="ltr"
          minLength={10}
          autoComplete="new-password"
        />
        <Field
          label="تکرار رمز جدید"
          name="password_confirmation"
          type="password"
          required
          dir="ltr"
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
        />
      </ActionForm>
    </AuthPage>
  );
}
