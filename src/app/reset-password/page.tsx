import { requireMember } from "@/lib/platform/data";
export const dynamic = "force-dynamic";
import { updatePassword } from "@/app/platform-actions";
import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
export const metadata = { title: "رمز عبور تازه", robots: { index: false } };
export default async function Reset() {
  await requireMember();
  return (
    <main id="main" className="mx-auto max-w-md space-y-6 px-6 py-20">
      <h1 className="text-2xl font-bold">رمز تازه را ثبت کنید.</h1>
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
    </main>
  );
}
