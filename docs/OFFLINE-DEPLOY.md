# انتشار موقت بدون اتصال مستقیم GitHub و سرور

> مسیر جایگزین است. پس از تغییر IP به `85.198.54.103`، برای بازگشت به انتشار مستقیم از [راهنمای تغییر IP](SERVER-IP-CHANGE.md) استفاده کنید. توصیه‌های خاموش‌کردن workflow مستقیم در ادامه فقط زمانی است که مشکل ارتباطی هنوز برقرار باشد.

وقتی SSH از GitHub به سرور و HTTPS از سرور به GitHub timeout می‌شود، از کامپیوتر به‌عنوان واسط استفاده می‌کنیم. بیلد و تست روی GitHub است؛ شما ZIP بسته آماده را دانلود و با SCP می‌فرستید. سرور build/pull/git clone نمی‌کند. Docker/Compose باید از مرحله bootstrap قبلی نصب شده باشند. بسته‌ها فقط از workflow معتبر مخزن خودتان دریافت شوند؛ checksum خرابی انتقال را کشف می‌کند، اما جای اعتماد به سازنده بسته یا تأیید میزبان SSH را نمی‌گیرد.

این راه تغییر دادهٔ Cloud، restore یا تغییر DNS را خودکار انجام نمی‌دهد. قبل از انتقال نهایی، دستورهای [انتقال دیتابیس و Storage](SELF-HOSTING.md) را انجام دهید. محدودیت دسترسی به ACME/SMTP/پیامک/بانک/FCM/تقویم‌ها هم جداست؛ بسته آفلاین قطع اینترنت سرویس‌های خارجی را حل نمی‌کند.

## ۱. جلوگیری از تلاش SSH قدیمی

در Repository variables مقدار `AUTO_DEPLOY=false` بماند. workflow قدیمی `Test, build and deploy MatchSho` را با prepare/deploy اجرا نکنید؛ برای این روش workflow جدید **Build offline deployment bundle** را انتخاب کنید. دو SSH Secret قدیمی لازم نیست حذف شوند، ولی در workflow جدید اصلاً خوانده نمی‌شوند. فعلاً نصب هر آپدیت دستی است، نه انتشار خودکار سرتاسری.

## ۲. بسته اول: prepare با زیرساخت کامل

GitHub → Actions → **Build offline deployment bundle** → Run workflow:

- Branch: `main`
- `package_kind`: **prepare**

تست/lint/typecheck سپس دانلود ایمیج‌های نسخه ثابت Supabase/Node/Caddy و بسته‌بندی اجرا می‌شود. بسته اولیه بزرگ است؛ هم کامپیوتر و هم سرور باید فضای کافی داشته باشند. بعد از سبز شدن، پایین صفحه Run در **Artifacts** فایل `matchsho-offline-prepare-SHA` را دانلود کنید. Artifact هفت روز نگهداری می‌شود؛ قبل از انقضا دانلود کنید. فایل واقعی env و پسوردهای موقت runner داخل بسته نیستند. رمزهای production فقط روی سرور تولید می‌شوند.

ZIP را روی کامپیوتر Extract کنید؛ پوشه‌ای که مستقیماً فایل‌های `RELEASE`، `BUNDLE_KIND`، `SHA256SUMS` و `install-offline.sh` را دارد پیدا کنید.

در **PowerShell کامپیوتر** مسیر واقعی آن پوشه را جایگزین کنید:

```powershell
$bundlePath = 'C:/Users/hp/Downloads/matchsho-offline-prepare-EXACT_SHA'
$releaseSha = (Get-Content -LiteralPath "$bundlePath/RELEASE" -Raw).Trim()
if ($releaseSha -notmatch '^[a-f0-9]{40}$') { throw 'Invalid RELEASE' }
ssh -i "$env:USERPROFILE/.ssh/matchsho-ci" matchsho@85.198.54.103 "mkdir -p /opt/matchsho/incoming/$releaseSha"
scp -i "$env:USERPROFILE/.ssh/matchsho-ci" "$bundlePath/*" "matchsho@85.198.54.103:/opt/matchsho/incoming/$releaseSha/"
Write-Output $releaseSha
```

برای پورت غیر 22، گزینه `-p PORT` برای ssh و `-P PORT` برای scp اضافه شود. کلید خصوصی به سرور upload نمی‌شود.

از جلسه مدیریتی **سرور** به کاربر برنامه بروید و SHA کامل و ایمیل واقعی را جایگزین کنید:

```bash
sudo -iu matchsho
bash /opt/matchsho/incoming/EXACT_SHA/install-offline.sh YOUR_REAL_EMAIL
```

اسکریپت فقط checksum/فضای دیسک را بررسی، ایمیج‌های زیرساخت را load، کانفیگ رسمی را باز و env هماهنگ را روی سرور تولید می‌کند. سایت یا دیتابیس production را روشن نمی‌کند. آن را با root اجرا نکنید؛ فایل‌های state باید متعلق به matchsho بمانند. در نصب ناقص/تکراری، release موجود overwrite نمی‌شود. برای retry پوشه دارای runtime/shared را حذف نکنید؛ خروجی خطا را بررسی و بخش ناقص را با حفظ credentials اصلاح کنید.

## ۳. تنظیمات عمومی را از سرور به GitHub بدهید

پس از prepare، روی **سرور، کاربر matchsho**:

```bash
cd /opt/matchsho/current
bash deploy/public-env.sh
```

فقط همین خروجی ۹ خطی را در **Settings → Secrets and variables → Actions → Variables → New repository variable** با نام **`OFFLINE_PUBLIC_ENV`** قرار دهید. این‌ها URL، کلید **anon جدید سرور** و تنظیمات عمومی Firebase هستند و در مرورگر هم منتشر می‌شوند. کل فایل `shared/app.env` را کپی نکنید؛ service_role، CRON_SECRET، رمز دیتابیس و Firebase private key نباید وارد variable، artifact یا build شوند. اعتبارسنج CI کلید خصوصی شناخته‌شده و مقادیر غیرمجاز را رد می‌کند، اما خودتان هم منبع خروجی را رعایت کنید.

در صورت نیاز Firebase عمومی را قبل از این مرحله در `/opt/matchsho/shared/app.env` کامل کنید و خروجی public-env.sh را دوباره بگیرید. متغیرهای خصوصی پیامک/SMTP/درگاه طبق راهنمای قبلی فقط روی سرور تنظیم می‌شوند. اگر بعداً هر تنظیم عمومی عوض شد، variable را به‌روز و ایمیج را دوباره build کنید؛ installer تنظیمات embedشده را با سرور تطبیق می‌دهد و در صورت اختلاف نصب را متوقف می‌کند.

## ۴. بسته دوم: deploy با ایمیج واقعی سایت

همان workflow جدید را با **`package_kind=deploy`** اجرا کنید. این بار Dockerfile با `OFFLINE_PUBLIC_ENV` واقعی build و smoke-test می‌شود و artifact `matchsho-offline-deploy-SHA` آماده می‌شود. آن را دانلود و Extract کنید و همان دستورهای PowerShell مرحله ۲ را با مسیر پوشه جدید اجرا کنید.

**برای اولین نصب، SHA بسته prepare و deploy باید یکی باشد.** تا تحویل اولین سایت روی main commit جدید ندهید. اگر commit جدید آمده، prepare همان نسخه جدید با حفظ shared لازم است؛ حذف یا تولید دوباره رمزها لازم نیست. بعد از فعال‌شدن production دیگر prepare اجرا نشود.

پس از SCP، روی **سرور، کاربر matchsho**:

```bash
bash /opt/matchsho/incoming/EXACT_SHA/install-offline.sh
```

بار اول فقط پیام تحویل ایمیج می‌دهد؛ هیچ سایت خالی روشن نمی‌شود. سپس انتقال DB/تاریخچه/baseline و فایل‌های Storage را طبق SELF-HOSTING انجام دهید، سرویس‌های بیرونی و DNS را تنظیم و پس از آماده‌بودن واقعی:

```bash
cd /opt/matchsho/current
bash deploy/activate.sh
bash deploy/check-ready.sh
```

فقط بعد از انتقال واقعی در پرسش activate، `MIGRATED` تایپ شود. بکاپ دیتابیس و تصاویر بخشی از artifact برنامه نیستند. قبل از snapshot نهایی باید نوشتن مبدأ متوقف/پرداخت‌های در جریان تعیین تکلیف شوند؛ marker production-ready را برای دورزدن این مرحله دستی نسازید.

## ۵. آپدیت‌های بعدی

کد روی main می‌رود، workflow جدید را با deploy اجرا می‌کنید، artifact دانلود و SCP می‌شود و installer همان بسته روی سرور اجرا می‌شود. installer از مسیر موجود release.sh استفاده می‌کند: بکاپ، migration تراکنشی افزایشی، recreate و healthcheck. داده و env در shared ثابت‌اند. وقفه کوتاه ممکن است؛ rollback SQL خودکار نداریم و migration باید با نسخه قبلی سازگار باشد. تغییر فایل‌های حساس زیرساخت مانند compose/stack/setup/configure/Caddyfile در مسیر روزمره مسدود و نیازمند maintenance است.

پیش از نصب، commit و نوع بسته را در GitHub تطبیق دهید؛ در حالت آفلاین سرور نمی‌تواند بفهمد کدام SHA آخرین main است. rollback یا بسته قدیمی را بدون بررسی schema نصب نکنید. installer نسخه active را تکرار نمی‌کند و release قبلی را overwrite نمی‌کند. پوشه بسته باید فقط محتویات همان artifact باشد؛ prepare و deploy با SHA برابر فایل‌های مشترک یکسان دارند و می‌توانند در incoming همان SHA قرار بگیرند.

از `docker system prune --volumes`، `down -v` یا حذف shared استفاده نکنید. بسته‌های حجیم و بکاپ‌ها خودکار پاک نمی‌شوند؛ نگهداری نسخه‌های لازم، بکاپ رمزگذاری‌شده خارج سرور و کنترل دیسک ضروری است.

## وضعیت اعتبارسنجی

اعتبارسنجی محلی شامل parser تنظیمات عمومی، محافظ‌های installer، workflow و syntax شل است. اجرای workflow بستهٔ زیرساخت و نصب واقعی روی سرور باید جدا بررسی شود؛ تا artifact ساخته و منتقل نشده، بستهٔ آماده روی سرور موجود فرض نشود.
