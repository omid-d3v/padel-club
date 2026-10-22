import { ActionForm } from "@/components/platform/action-form";
import { Field } from "@/components/platform/fields";
import { requestPasswordReset } from "@/app/platform-actions";
export const metadata = { title: "بازیابی رمز", robots: { index: false } };
export default function Forgot() {
  return (
    <main id="main" className="mx-auto max-w-md space-y-6 px-6 py-20">
      <h1 className="text-2xl font-bold">برگرد به بازی.</h1>
      <p className="text-sm text-muted-foreground">
        راهنمای بازیابی را به ایمیل حسابت می‌فرستیم.
      </p>
      <ActionForm action={requestPasswordReset} label="درخواست لینک بازیابی">
        <Field label="ایمیل" name="email" type="email" required dir="ltr" />
      </ActionForm>
    </main>
  );
}
