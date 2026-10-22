# راهنمای انتشار و عملیات

این نسخه، همان پروژه Supabase با شناسه `bcfbvxmwozmewshctzch` را گسترش می‌دهد. ساخت پروژه جدید، reset، پاک‌کردن تاریخچه و اجرای مجدد SQL قدیمی ممنوع است. فایل‌های جدید هنوز روی production اجرا نشده‌اند.

## پیش از انتشار

۱. ابتدا تغییرات branch `feat/platform-expansion` را بررسی و تست‌ها را اجرا کنید. یک staging از پشتیبان بسازید و جریان ورود، بازی‌های قدیمی، رزرو، Storage و RLS را روی Supabase واقعی بررسی کنید. PGlite، سرویس Auth/Storage واقعی یا رقابت چند اتصال را شبیه‌سازی کامل نمی‌کند.

۲. با CLI رسمی Supabase وارد و به پروژه موجود متصل شوید. فایل‌های پشتیبان را در محل امن خارج از Git نگه دارید:

```bash
supabase login
supabase link --project-ref bcfbvxmwozmewshctzch
supabase migration list --linked
supabase db dump --linked --file /SECURE_BACKUP/schema.sql
supabase db dump --linked --data-only --use-copy --file /SECURE_BACKUP/data.sql
supabase db dump --linked --role-only --file /SECURE_BACKUP/roles.sql
```

این dump جای پشتیبان سرویس Auth، فایل‌های Storage و PITR را نمی‌گیرد. بکاپ مدیریت‌شده و امکان بازیابی را در داشبورد نیز بررسی کنید؛ حداقل یک restore آزمایشی در staging انجام شود. خروجی dump می‌تواند اطلاعات شخصی داشته باشد و نباید commit شود.

۳. شمارش `players`، `tournaments`، `matches`، `match_sets`، `tournament_results`، `auth.users` و `admins` و نتایج تاریخی را قبل/بعد ثبت کنید. در ممیزی ابتدایی ۲۰ بازیکن، ۲ تورنمنت و یک ادمین وجود داشت؛ این شمارش تضمین وضعیت فعلی نیست.

۴. تاریخچه قبلی remote با نام محلی timestamp یکسان ندارد:

| نسخه remote    | فایل متناظر محلی                                    |
| -------------- | --------------------------------------------------- |
| 20260921094951 | 001_initial.sql                                     |
| 20260923154020 | 20260923143706_round_winners_and_match_deletion.sql |
| 20260923221728 | 20260923220511_delete_tournament.sql                |

این اختلاف باید پیش از `db push` حل شود. پس از مقایسه SQL واقعی، فهرست migration و پشتیبان جدول `supabase_migrations.schema_migrations`، تنها وضعیت تاریخچه با `supabase migration repair --status applied/reverted VERSION` هم‌تراز می‌شود؛ این دستور schema را اجرا نمی‌کند. بدون بررسی، نسخه‌ای را repair یا حذف نکنید و `--include-all` نزنید. سه migration جدید را جداگانه و با تاریخچه رسمی اعمال کنید. SQL اولیه قبلاً اجرا شده و نباید دوباره اجرا شود.

۵. پس از تأیید طرح پشتیبان و پنجره انتشار، فقط migrationهای 20261022 را اعمال کنید؛ سپس مجوزها، شمارش تاریخچه و smoke test را بررسی کنید و deployment اپ را ارتقا دهید. تا پیش از موفقیت SQL، نسخه تازه را جایگزین production نکنید.

## احراز هویت و تصاویر

ثبت‌نام ایمیلی Supabase را فعال، تأیید ایمیل را حفظ و SMTP واقعی را تنظیم کنید. Site URL برابر دامنه production و Redirect URLs شامل `https://YOUR_DOMAIN/auth/confirm` و مسیرهای بازیابی همان دامنه باشد. بازیابی از `/auth/confirm?next=/reset-password` عبور می‌کند. برای قالب‌های token_hash، لینک تأیید به `/auth/confirm?token_hash={{ .TokenHash }}&type=signup` و بازیابی با `type=recovery&next=/reset-password` متصل شود. توسعه فقط localhost جداگانه.

دو bucket توسط migration ساخته می‌شوند: `club-images` عمومی حداکثر ۳MB، `avatars` عمومی حداکثر ۲MB؛ فقط JPEG/PNG/WebP. سقف فرم با محدودیت بدنه Vercel هماهنگ است. نوشتن عکس باشگاه ادمین و آواتار در پوشه شناسه خود کاربر مجاز است. داده حساس در bucket عمومی قرار ندهید.

## فعال‌سازی زرین‌پال

`ZARINPAL_MERCHANT_ID` شناسه UUID پذیرنده، `SUPABASE_SECRET_KEY` کلید محرمانه پروژه، `NEXT_PUBLIC_SITE_URL` دامنه HTTPS قطعی و `ZARINPAL_SANDBOX=false` باشند. callback:

```text
https://YOUR_DOMAIN/api/payments/zarinpal/callback
```

مبلغ از دیتابیس به ریال خوانده و همان مبلغ verify می‌شود؛ نمایش UI تومان است. callback کاربر یا Status به‌تنهایی تأیید نیست. کدهای verify صد و صد‌ویک با ref معتبر پذیرفته می‌شوند. تکرار callback، مبلغ متفاوت و پرداخت دیرهنگام کنترل می‌شود. پس از timeout مبهم درخواست، پرداخت جدید کورکورانه ساخته نمی‌شود؛ سفارش نیازمند بررسی می‌ماند. ابتدا با پذیرنده آزمایشی و سپس یک تراکنش کم‌مبلغ واقعی و استرداد عملیاتی آزمایش کنید.

استرداد خودکار بانکی ادعا نمی‌شود: درخواست استرداد در دیتابیس ثبت و مدیر پس از واریز واقعی، مرجع بانکی را در پنل ثبت می‌کند. تطبیق روزانه پرداخت‌های معلق، پرداخت‌های بدون authority و استردادها لازم است.

## اجرای jobها

دو مسیر مستقل وجود دارد:

- انقضای رزرو/جایگاه/ثبت‌نام: پس از فعال‌کردن pg_cron، فایل `ops/enable-expiry-cron.sql` را اجرا کنید. اجرا هر دقیقه و idempotent است.
- قیمت/نگه‌داشت/تأیید/لغو خارجی و تطبیق پرداخت: `GET /api/jobs` فقط با `Authorization: Bearer CRON_SECRET`. در scheduler معتبر هر دقیقه اجرا و خطا/تاخیر مانیتور شود. نمونه تنظیم Vercel در `ops/vercel-cron.example.json` است؛ فقط اگر پلن فاصله یک‌دقیقه را پشتیبانی کند به تنظیم اصلی منتقل کنید. در غیر این صورت scheduler خارجی معتبر استفاده شود. تنظیم نمونه به‌خودی‌خود job فعال نمی‌کند.

secret تصادفی قوی با `openssl rand -hex 32` بسازید؛ در URL یا سورس نگذارید. درخواست 401 یعنی credential غلط؛ 503 یعنی بررسی logs و retry لازم است. scheduler پیش از فعال‌سازی پرداخت باید عملاً بررسی شود. RPCها نیز زمان/مهلت را مستقل از cron کنترل می‌کنند.

تلاش خارجی قفل پنج‌دقیقه‌ای و حداکثر پنج اجرا دارد. timeout مبهم به `needs_attention` می‌رود؛ مدیر پس از بررسی «استعلام و تلاش دوباره» را می‌زند. استعلام با کلید ثابت قبل از خرید مجدد انجام می‌شود. هیچ تماس HTTP داخل تراکنش مالی SQL نیست.

## قرارداد اتصال مجاز باشگاه

worker روی Node.js با سقف اجرای ۳۰۰ ثانیه تنظیم شده و پیش از رسیدن به timeout، گرفتن کار تازه را متوقف می‌کند. وضعیت تأییدهای خارجی نامشخص را نیز بدون خرید دوباره استعلام می‌کند. در محیط Vercel تنظیم Fluid Compute و سقف واقعی پروژه بررسی شود؛ [مستند مدت اجرا](https://vercel.com/docs/functions/configuring-functions/duration). برای مهلت تکمیل بازی، مقدار پیش‌فرض باشگاه ۴ ساعت است و مدیر می‌تواند آن را زودتر (تا ۷۲ ساعت قبل) تنظیم کند؛ cutoff در هر بازی snapshot می‌شود.

`BOOKING_PROVIDERS_JSON` تنظیم server-only با ساختار زیر است؛ `provider_key` باشگاه باید همان کلید و `external_court_ref` زمین مقدار واقعی ارائه‌دهنده باشد:

```json
{
  "authorized-club": {
    "baseUrl": "https://AUTHORIZED_BRIDGE.example/api",
    "token": "SERVER_ONLY",
    "capabilities": {
      "holds": true,
      "cancellation": true,
      "idempotency": true,
      "authorizationCapture": false
    }
  }
}
```

این، قرارداد middleware خودمان است و ادعای وجود چنین API در سایت هیچ باشگاهی نیست. با مستندات/مجوز باشگاه باید bridge واقعی پیاده و integration test شود. اسکرپ یا دسترسی غیرمجاز انجام نمی‌شود.

همه درخواست‌ها POST JSON با Bearer، timeout و redirect ممنوع؛ عملیات نوشتن `Idempotency-Key` ثابت دارند. قیمت‌ها integer ریال و تاریخ‌ها ISO دارای offset هستند:

| مسیر bridge         | ورودی                   | پاسخ                                                |
| ------------------- | ----------------------- | --------------------------------------------------- |
| availability        | court, from, to         | آرایه reference, startsAt, endsAt, price, available |
| quote               | court, startsAt, endsAt | quoteId, price, validUntil, cancellationPolicy      |
| holds               | quoteId                 | reference, expiresAt                                |
| bookings/confirm    | quoteId, hold اختیاری   | status, reference, price اختیاری                    |
| bookings/status     | idempotencyKey          | status, reference اختیاری                           |
| bookings/cancel     | reference               | status, reference اختیاری                           |
| cancellation-policy | شیء خالی                | سیاست واقعی ارائه‌دهنده                             |

وضعیت پاسخ booking یکی از confirmed/pending/cancelled/failed/not_found است. confirmed بدون مرجع معتبر، قطعی نیست. پاسخ status باید سفارش را با کلید idempotency پیدا کند. API بدون این قابلیت برای خرید خودکار مناسب نیست. سانس‌های محلی باید با تقویم واقعی ارائه‌دهنده هم‌تراز شوند.

تا نبود اعتبار تنظیمات، پرداخت/خرید خارجی فعال نمی‌شود. اگر hold ارائه نشود، وجه دریافتی مشارکت موقت است؛ بعد از همه پرداخت‌ها قیمت/موجودی بازبینی و خرید انجام می‌شود؛ شکست خرید، درخواست استرداد کامل می‌سازد. پلتفرم به‌تنهایی authorization/capture کارت بانکی ارائه نمی‌کند.

## کنترل پس از انتشار و بازیابی

ورود کاربر/ادمین، تکمیل پروفایل، Storage، صفحه عمومی با SSR، sitemap، راندهای تاریخی، درخواست رزرو، تأیید دستی، پرداخت/verify تکراری، بازی ناقص در cutoff، استرداد و job را روی staging و سپس production با داده مشخص آزمایش کنید. logs نباید token، کلید، اطلاعات کارت یا پاسخ کامل provider را چاپ کنند.

بازگشت کم‌خطر: deployment قبلی را restore، پذیرش سفارش جدید را متوقف و جدول‌های افزوده را حفظ کنید. پرداخت‌های در جریان و callbackها را قبل از خاموش‌کردن worker تعیین تکلیف کنید. rollback SQL با DROP توصیه نمی‌شود؛ forward-fix ترجیح دارد. restore داده فقط با تأیید جداگانه و تطبیق مالی انجام شود.

LCP/INP/CLS هدف محصول هستند، نه نتیجه اثبات‌شده؛ اندازه‌گیری واقعی در دامنه production و کاربران واقعی لازم است. بررسی محلی، rich result یا امتیاز Core Web Vitals را تضمین نمی‌کند.
