import { PanelTop, Check, Settings2 } from "lucide-react";
export default function Setup() {
  return (
    <main id="main" className="grid min-h-screen place-items-center p-5">
      <div className="panel w-full max-w-xl p-7 md:p-10">
        <span className="mb-8 grid size-14 place-items-center rounded-2xl bg-primary">
          <PanelTop size={30} />
        </span>
        <p className="text-sm text-emerald-800">پدل کلاب / راه‌اندازی</p>
        <h1 className="mb-4 mt-3 text-3xl font-extrabold">
          یک قدم تا اولین بازی
        </h1>
        <p className="text-sm leading-8 text-muted-foreground">
          برای نمایش بازیکنان و مسابقات واقعی، اتصال دیتابیس را تنظیم کنید.
          راهنمای کامل در README پروژه قرار دارد.
        </p>
        <ol className="my-8 space-y-5 text-sm">
          <li className="flex items-center gap-3">
            <Settings2 size={20} />
            تنظیم آدرس و کلید عمومی Supabase در فایل محیطی
          </li>
          <li className="flex items-center gap-3">
            <Settings2 size={20} />
            اجرای فایل SQL و ایجاد حساب مدیر
          </li>
          <li className="flex items-center gap-3">
            <Check size={20} />
            راه‌اندازی دوباره و ورود به پنل
          </li>
        </ol>
        <div className="rounded-xl bg-muted p-4 text-xs leading-7">
          هیچ داده آزمایشی در محصول نمایش داده نمی‌شود. پس از اتصال، اولین
          بازیکنان خود را ثبت کنید.
        </div>
      </div>
    </main>
  );
}
