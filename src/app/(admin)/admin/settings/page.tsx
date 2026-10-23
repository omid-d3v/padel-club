import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/platform/action-form";
import { Field, CheckField } from "@/components/platform/fields";
import { savePaymentSettings } from "@/app/transfer-actions";
import { paymentConfigured } from "@/lib/payments/zarinpal";
export default async function Settings() {
  const db = await requireAdmin();
  const { data: settings, error } = await db
    .from("payment_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error || !settings) throw new Error("دریافت تنظیمات پرداخت انجام نشد.");
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">مدیریت پلتفرم</p>
        <h1 className="text-2xl font-extrabold">تنظیمات</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          روش‌های پرداخت و اطلاعات کارت مقصد را از اینجا مدیریت کنید.
        </p>
      </header>
      <div className="platform-card">
        <ActionForm
          action={savePaymentSettings}
          label="ذخیره تنظیمات پرداخت"
          buttonVariant="default"
        >
          <h2>کارت‌به‌کارت</h2>
          <CheckField
            name="card_enabled"
            label="پرداخت کارت‌به‌کارت فعال باشد"
            checked={settings.card_enabled}
          />
          <Field
            name="card_number"
            label="شماره کارت مقصد؛ ۱۶ رقم"
            defaultValue={settings.card_number}
            inputMode="numeric"
            dir="ltr"
            autoComplete="off"
            maxLength={30}
          />
          <Field
            name="card_holder"
            label="نام صاحب کارت"
            defaultValue={settings.card_holder}
            maxLength={100}
          />
          <p className="text-xs leading-7 text-muted-foreground">
            این اطلاعات به پرداخت‌کننده نمایش داده می‌شود. قبل از تأیید هر رسید،
            واریز را در گردش حساب تطبیق دهید؛ تصویر رسید به‌تنهایی اثبات واریز
            نیست.
          </p>
          <hr className="my-4 border-border" />
          <h2>زرین‌پال</h2>
          <CheckField
            name="zarinpal_enabled"
            label="پرداخت زرین‌پال فعال باشد"
            checked={settings.zarinpal_enabled}
          />
          {!paymentConfigured() && (
            <p role="status" className="text-sm leading-7 text-amber-900">
              کلیدها و تنظیمات سروری زرین‌پال کامل نیست؛ روشن‌کردن این گزینه
              به‌تنهایی درگاه را راه‌اندازی نمی‌کند.
            </p>
          )}
          <p className="text-xs leading-7 text-muted-foreground">
            غیرفعال‌کردن روش، شروع پرداخت تازه را می‌بندد؛ رسیدها و پرداخت‌های
            قبلی همچنان قابل بررسی هستند. تغییر شماره کارت، اطلاعات مقصد سفارش
            قبلی را تغییر نمی‌دهد.
          </p>
        </ActionForm>
      </div>
    </section>
  );
}
