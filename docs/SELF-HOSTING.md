# استقرار مچ شو روی سرور شخصی و انتقال از Cloud

برای سرور خام Ubuntu ایران و انتشار خودکار از GitHub، از [راهنمای مرحله‌به‌مرحله Ubuntu و Actions](UBUNTU-GITHUB-DEPLOY.md) شروع کنید. آن راهنما کانفیگ همین فایل را با انتقال آفلاین ایمیج‌ها و نگهداری دائمی داده‌ها به‌کار می‌گیرد؛ بخش‌های انتقال دیتابیس و Storage این فایل همچنان مرجع هستند.

مقصد برنامه‌ریزی‌شده: `85.198.54.103`، سایت `https://match-sho.com` و API سوپابیس `https://api.match-sho.com`.
این فایل دستورالعمل است؛ وجود کانفیگ به معنی مهاجرت انجام‌شده یا اتصال دامنه نیست. تا پایان تست و انتقال نهایی، Supabase Cloud و Vercel را حذف نکنید.

## معماری و پیش‌نیازها

```text
Internet → Caddy :443 → web :3000 (Next.js)
                    └→ api-gw :8000 → Supabase Auth / REST / Storage / Functions
                                          └→ PostgreSQL (دیسک پایدار)
scheduler → web /api/jobs      pg_cron → calendar-sync → تقویم زمین‌ها
```

- Ubuntu/Debian پشتیبانی‌شده و به‌روز، Git، Bash، Docker Engine و Docker Compose **2.24.4 یا جدیدتر**. برای نصب Docker از [راهنمای رسمی Ubuntu](https://docs.docker.com/engine/install/ubuntu/) استفاده کنید. دستورهای این راهنما روی Linux اجرا می‌شوند، نه PowerShell.
- حداقل رسمی کل استک Supabase: ۲ هسته، رم ۴GB و SSD ۴۰GB؛ همراه سایت حاشیه محدود است. build را روی دستگاه/CI دیگری انجام دهید و مصرف واقعی را بررسی کنید. فایل swap جای رم واقعی را نمی‌گیرد. نسخهٔ کامل پیش‌فرض سرویس‌ها را بدون دلیل حذف نکنید؛ Auth و Storage برای پروژه لازم‌اند.
- فقط SSH (ترجیحاً محدود به IP خودتان)، TCP 80 و 443 در فایروال آروان و سیستم باز باشند. **5432، 6543، 8000 و 3000 عمومی نشوند.** Docker می‌تواند بعضی قواعد UFW را دور بزند؛ از فایروال شبکهٔ آروان هم استفاده کنید.
- کاربر Docker دسترسی تقریباً معادل root دارد؛ دسترسی را محدود کنید.
- مخزن رسمی Supabase در `deploy/runtime/supabase` با commit ثابت `bc27d2661edd09a5d0b8d76ce33da6d4071a756e` (release `self-hosted/v0.8.3`) دریافت می‌شود. این نسخه PostgreSQL 17 دارد. نسخهٔ مبدأ و افزونه‌ها را پیش از انتقال بررسی کنید.
- کلیدهای سرویس، رمز دیتابیس و فایل‌های backup خصوصی‌اند. آن‌ها را در چت، گیت، screenshot یا خروجی `docker compose config` منتشر نکنید. برای بررسی کانفیگ از `config --quiet` استفاده کنید.

## ۱. آماده‌سازی سرور، بدون تغییر سایت فعلی

```bash
git clone https://github.com/omid-d3v/padel-club.git
cd padel-club
bash deploy/setup.sh match-sho.com api.match-sho.com YOUR_REAL_EMAIL
bash deploy/stack.sh config --quiet
```

setup فقط فایل‌ها را آماده می‌کند و سرویس یا دیتابیس را راه نمی‌اندازد. به‌جای ایمیل نمونه، ایمیل واقعی گواهینامه را بدهید. اجرای مجدد، فایل و کلید قبلی را overwrite نمی‌کند. اگر دریافت upstream نیمه‌کاره شد، مسیر را بررسی و نسخهٔ ناقص را به نام دیگری منتقل کنید؛ پوشهٔ دارای دیتای واقعی را حذف نکنید.

دو فایل خصوصی تولید می‌شوند:

- `deploy/.env.app`: دامنه، کلیدهای اتصال سایت، پیامک، درگاه، Firebase و کلیدهای worker.
- `deploy/runtime/supabase/docker/.env`: رمز و تنظیمات خود سوپابیس، SMTP، URLها و کلیدهای رمزنگاری.

کلید خصوصی سایت در فایل اول `MATCHSHO_SUPABASE_SECRET_KEY` نام دارد؛ compose آن را فقط برای `web` به `SUPABASE_SECRET_KEY` نگاشت می‌کند تا با متغیر هم‌نامِ کلید opaque در فایل رسمی سوپابیس تداخل نداشته باشد.

فایل‌های واقعی ignored هستند؛ `deploy/app.env.example` فقط الگوست. setup رمز و JWT جدید تولید می‌کند؛ کلیدهای Cloud را کپی نمی‌کند. در این نسخه از مسیر رسمیِ سازگاری HS256 و کلیدهای anon/service_role استفاده می‌شود؛ نام متغیر سایت همچنان `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` است ولی مقدارش anon JWT جدید خواهد بود. کلید service_role فقط در متغیر server-only قرار دارد. کلیدها و دادهٔ `/etc/postgresql-custom` را بدون برنامه rotate نکنید.

قبل از ثبت‌نام واقعی، SMTP معتبر را در `.env` سوپابیس تنظیم کنید؛ mail server آزمایشی upstream واقعی نیست. تأیید ایمیل و شماره به‌طور خودکار دور زده نمی‌شود. فعال‌سازی پیامک در بخش پایین توضیح داده شده است.

## ۲. ساخت ایمیج سایت

روی دستگاه Linux/CI با Docker و حافظه کافی، checkout همان release را بگیرید. لازم نیست رمز دیتابیس یا service_role سرور را به CI بدهید؛ فقط سه مقدار عمومی زیر لازم‌اند:

```bash
read -rp 'New server public anon key: ' PUBLIC_ANON_KEY
docker build -t matchsho-web:local \
  --build-arg NEXT_PUBLIC_SITE_URL=https://match-sho.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.match-sho.com \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLIC_ANON_KEY" .
unset PUBLIC_ANON_KEY
docker image save matchsho-web:local -o matchsho-web.tar
# انتقال فایل با scp به سرور؛ روی سرور:
docker image load -i matchsho-web.tar
```

build از داخل همین repo اجرا می‌شود. Dockerfile چندمرحله‌ای، خروجی standalone و کاربر غیر root دارد. فایل‌های `.env`، بکاپ‌ها و runtime سوپابیس وارد context نمی‌شوند. فقط متغیرهای عمومی `NEXT_PUBLIC_*` به build داده می‌شوند؛ secrets هنگام اجرا وارد می‌شوند. **با تغییر دامنه، URL/کلید عمومی سوپابیس یا Firebase عمومی، ایمیج را دوباره بسازید.** تغییر env زمان اجرا، مقدار کامپایل‌شده در مرورگر را عوض نمی‌کند.

در صورت استفاده از پوش، شش مقدار عمومی Firebase را هم با `--build-arg NEXT_PUBLIC_FIREBASE_...=...` مطابق ARGهای Dockerfile اضافه کنید؛ credential حساب سرویس را اضافه نکنید. ساخت روی خود سرور با `bash deploy/stack.sh build web` ممکن است، اما روی رم ۴GB هم‌زمان با دیتابیس production توصیه نمی‌شود. در CI آنلاین می‌توان ایمیج را به رجیستری خصوصی push کرد و `MATCHSHO_IMAGE=registry.example.com/matchsho:RELEASE` را در `.env.app` گذاشت. image tag نسخه‌دار و image قبلی را برای rollback نگه دارید. secrets را در image ذخیره نکنید. اگر registry از شبکهٔ سرور در دسترس نیست، mirror معتبر با همان digest یا انتقال image ساخته‌شده راه‌حل است؛ برای دورزدن خطا pin را به `latest` تبدیل نکنید.

## ۳. اجرای زیرساخت مقصد

```bash
bash deploy/stack.sh pull db auth rest storage imgproxy meta studio api-gw functions realtime supavisor caddy tools
bash deploy/stack.sh up -d db auth rest storage imgproxy meta studio api-gw functions realtime supavisor
bash deploy/stack.sh ps
```

مسیر bind-mountهای دیتابیس و فایل‌ها به runtime upstream ثابت است؛ تغییر cwd باعث ساخت دیتابیس دیگری نمی‌شود. `db-config` و دادهٔ گواهی Caddy named volume دارند. از `down -v`، `docker volume prune`، reset.sh upstream و حذف `deploy/runtime` استفاده نکنید؛ این‌ها می‌توانند دیتای ماندگار را از بین ببرند. `stop` داده‌ها را حذف نمی‌کند.

### مسیر A: نصب کاملاً خالی، بدون اطلاعات قبلی

فقط اگر هیچ داده‌ای از Cloud منتقل نمی‌کنید:

```bash
bash deploy/migrate.sh apply
bash deploy/migrate.sh jobs
bash deploy/stack.sh up -d web caddy scheduler
```

migration runner ترتیب نسخه‌ها، قفل تراکنشی و checksum دارد. همهٔ migrationهای جدید در یک تراکنش اجرا می‌شوند؛ خطا باعث rollback است. اجرای مجدد نسخه‌های قبلی را تکرار نمی‌کند. اگر دیتابیس موجود بدون تاریخچه ببیند، متوقف می‌شود. فایل SQL اجراشده را ویرایش نکنید؛ migration جدید بسازید. هیچ ادمین نمونه یا کاربر ساختگی تولید نمی‌شود؛ ادمین واقعی باید از مسیر مدیریتی امن ثبت شود.

### مسیر B: انتقال سایت فعلی — مسیر مناسب شما

**در این مسیر قبل از restore، `migrate.sh apply` اجرا نکنید.** دیتابیس restoreشده از قبل جدول و تابع دارد. مایگریشن‌ها جایگزین بکاپ نیستند و اجرای SQLهای قدیمی روی آن اشتباه است.

## ۴. انتقال دیتابیس Cloud و تاریخچهٔ مایگریشن

ابتدا انتقال آزمایشی روی مقصد خالی انجام دهید؛ در آن مرحله سایت فعلی هنوز فعال است. قبل از cutover، مرحلهٔ dump/restore نهایی باید با توقف نوشتن مبدأ تکرار شود. ورود، رزرو، پرداخت، تغییر پروفایل، workerهای مبدأ و upload باید در بازهٔ نهایی متوقف/تخلیه شوند. تراکنش‌های بانکی در جریان و callbackهایشان را تعیین تکلیف کنید؛ صرف تغییر DNS مانع نوشتن کاربرانِ دارای cache قدیمی نمی‌شود. اگر maintenance امن مبدأ آماده نیست، هنوز cutover نکنید.

روی دستگاه امن دارای Docker، Supabase CLI و `psql`:

```bash
umask 077
mkdir -p backups/cloud-final
# CLI استفاده‌شده هنگام آماده‌سازی این راهنما؛ ابتدا help را بررسی کنید.
npx --yes supabase@2.54.11 db dump --help
read -rsp 'Cloud connection string (Dashboard → Connect): ' CLOUD_DB_URL; echo
npx --yes supabase@2.54.11 db dump --db-url "$CLOUD_DB_URL" --role-only -f backups/cloud-final/roles.sql
npx --yes supabase@2.54.11 db dump --db-url "$CLOUD_DB_URL" -f backups/cloud-final/schema.sql
npx --yes supabase@2.54.11 db dump --db-url "$CLOUD_DB_URL" --data-only --use-copy -f backups/cloud-final/data.sql
psql "$CLOUD_DB_URL" -X -q -v ON_ERROR_STOP=1 -c '\copy (select version from supabase_migrations.schema_migrations order by version) to stdout with csv header' > backups/cloud-final/history.csv
unset CLOUD_DB_URL
```

Connection string را از پنل بگیرید، رمز را URL-encode کنید، به گیت/چت ندهید و `set -x` روشن نکنید. dumpها حاوی اطلاعات کاربران و hash رمز هستند. CLI ممکن است در فرایند dump از imageهای Docker استفاده کند. شمارهٔ major PostgreSQL، نسخهٔ Auth/Storage و افزونه‌های دو طرف را مقایسه کنید؛ در صورت خطای ستون/جدول، ادامه ندهید یا کورکورانه داده‌ها را حذف نکنید. راهنمای رسمی restore پایین لینک شده است. قبل از restore مطمئن شوید خروجی داده شامل حساب‌های `auth.users` و bucketهاست؛ فایل را بدون نمایش محتویات خصوصی بررسی کنید.

فایل‌ها را رمزگذاری‌شده/با SSH روی سرور به `backups/cloud-final` منتقل کنید. سرویس‌های مقصد هنگام restore نباید با دیتای نیمه‌کاره کار کنند؛ بعد از bootstrap دیتابیس:

```bash
bash deploy/stack.sh stop web scheduler auth rest storage functions realtime supavisor studio meta api-gw
# فقط db روشن می‌ماند. db باید مقصد خالی باشد، نه نسخه‌ای که نصب A رویش اجرا شده است.
{ cat backups/cloud-final/roles.sql backups/cloud-final/schema.sql; printf '\nSET session_replication_role = replica;\n'; cat backups/cloud-final/data.sql; } |
  bash deploy/stack.sh exec -T db psql -X -h 127.0.0.1 -U postgres -d postgres --single-transaction --set=ON_ERROR_STOP=1
```

این dump فیلترشدهٔ CLI است؛ از raw full dump دیتابیس Cloud به‌جای آن استفاده نکنید. اگر restore شکست خورد، تراکنش rollback می‌شود؛ قبل از retry علت ناسازگاری را حل کنید. حساب‌ها، IDها، رزروها، پرداخت‌ها، توابع، RLS و نقش‌ها باید حفظ شوند. JWT جدید است و کاربران باید مجدداً وارد شوند. کلیدها، SMTP، تنظیمات Auth، hookها، فایل‌های Storage و Edge Functionها با SQL به‌تنهایی منتقل نمی‌شوند.

تاریخچهٔ مبدأ را جدا وارد کنید (روی مقصد تازه). اگر restore قبلاً جدول history را با داده برگردانده، CSV را دوباره وارد نکنید؛ نسخه‌ها را مقایسه و مستقیماً baseline را اجرا کنید:

```bash
bash deploy/stack.sh exec -T db psql -X -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);'
cat backups/cloud-final/history.csv |
  bash deploy/stack.sh exec -T db psql -X -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c '\copy supabase_migrations.schema_migrations(version) from stdin with csv header'
bash deploy/migrate.sh baseline-cloud
bash deploy/migrate.sh apply
```

baseline فقط وقتی همهٔ نسخه‌های همین checkout در تاریخچهٔ Cloud وجود داشته باشند، checksumها را ثبت می‌کند؛ SQL قدیمی را اجرا نمی‌کند. نسخهٔ اضافی/کمتر باعث توقف می‌شود. تطبیق history به‌تنهایی drift ناشی از SQL دستی روی Cloud را اثبات یا رد نمی‌کند؛ schema dump و تست‌های عملی را هم بررسی کنید. قبل از export، Cloud و checkout را هم‌نسخه کنید یا checkout دقیقاً مطابق مبدأ بگیرید؛ history را برای دورزدن خطا جعل نکنید. در این سازوکار `_matchsho_deploy.migrations` دفتر استقرار بعدی است؛ CLI `db push` را موازی این runner روی همین مقصد استفاده نکنید. هنگام انتقال آزمایشی و نهایی، از مقصدهای جدا/خالی استفاده کنید؛ بازگرداندن dump روی دادهٔ جدید بدون برنامه ممکن است اطلاعات را overwrite کند.

## ۵. انتقال فایل‌ها: تصاویر و رسیدهای خصوصی

```bash
bash deploy/stack.sh up -d auth rest storage imgproxy meta studio api-gw functions realtime supavisor
```

تعریف bucket، محدودیت حجم، MIME و RLS را با مبدأ مقایسه کنید. bucket `payment-receipts` باید خصوصی بماند. `storage.objects` صرفاً metadata است؛ کپی SQL به معنی انتقال عکس نیست. عکس‌ها را مستقیم داخل `volumes/storage` نریزید؛ ساختار داخلی فایل‌ها متفاوت است.

از S3 endpoint و rclone استفاده کنید. در Cloud → Storage → S3 Configuration کلید موقت ایجاد کنید؛ کلید S3 مقصد در `.env` جدید سوپابیس است. اگر پلن مبدأ S3 را ارائه نمی‌دهد، از روش پشتیبانی‌شدهٔ Storage API با credential مدیریتی و حفظ نام bucket/key استفاده کنید؛ قبل از تغییر مسیر روی چند فایل تست کنید.

```bash
rclone config
# remote cloud: نوع S3 / provider Other / endpoint مبدأ پنل / region پنل
# remote selfhost: نوع S3 / provider Other
# endpoint = https://api.match-sho.com/storage/v1/s3
# region = stub (یا REGION تنظیم‌شده در .env سوپابیس)
# force_path_style = true
# credentials مقصد = S3_PROTOCOL_ACCESS_KEY_ID / S3_PROTOCOL_ACCESS_KEY_SECRET
rclone copy cloud:payment-receipts selfhost:payment-receipts --immutable --progress
rclone check cloud:payment-receipts selfhost:payment-receipts --download --one-way
```

این کار را برای **همهٔ bucketهای واقعی مبدأ** از جمله avatar/تصاویر باشگاه انجام دهید؛ فهرست را از پنل بگیرید، نام‌ها را حدس نزنید. از `sync`، `delete` و `--ignore-errors` استفاده نکنید. `--immutable` در صورت فایل هم‌نام با محتوای متفاوت متوقف می‌شود؛ دلیل را بررسی کنید. فایل کانفیگ rclone را محرمانه نگه دارید. پس از انتقال نهایی، کلید موقت مبدأ را باطل کنید. URLهای مطلق ذخیره‌شده با دامنهٔ Cloud را بررسی و پس از بکاپ فقط prefix عمومیِ شناخته‌شده را به دامنهٔ API جدید تبدیل کنید؛ path فایل و مالکیت‌ها نباید عوض شوند. `avatar_path` معمولاً مسیر نسبی است و نیاز به تغییر ندارد.

برای API جدید می‌توانید **قبل از تغییر دامنهٔ اصلی سایت** رکورد `api` را متصل کنید و Caddy را روشن کنید:

```bash
bash deploy/stack.sh up -d caddy
```

دامنهٔ اصلی تا تغییر DNS روی Vercel می‌ماند؛ گواهی آن روی Caddy ممکن است تا آن زمان صادر نشود. برای تست کامل ورود، دامنهٔ آزمایشی جدا با تغییر هماهنگ URLها و rebuild آماده کنید، سپس به دامنهٔ اصلی برگردید؛ HTTPS را برای production غیرفعال نکنید.

## ۶. تقویم‌ها، پیامک، ایمیل، پرداخت و پوش

- `calendar-sync` و `_shared` همین repo به Edge Runtime متصل‌اند؛ function مبدأ لازم نیست در Cloud باقی بماند. gateway عمومی فقط همین function را عبور می‌دهد. function مستقل از JWT با توکن خصوصی داخل Vault احراز هویت می‌شود؛ تنظیم رسمی `FUNCTIONS_VERIFY_JWT=false` برای این مسیر عمدی است، نه مجوز دسترسی بدون کنترل.
- `bash deploy/migrate.sh jobs` را **بعد از restore** اجرا کنید تا توکن تقویم و URL داخلی جدید در Vault تنظیم شوند و دو cron مخصوص پروژه فعال شوند. Vault/pg_cron/pg_net باید موجود باشند. اسرار رمز‌شدهٔ Vault مبدأ را کورکورانه با کلید جدید restore نکنید؛ تنظیمات کاربردی را امن دوباره بسازید.
- `scheduler` مستقل از Vercel هر حدود یک دقیقه، بدون هم‌پوشانیِ همان process، `/api/jobs` را با `CRON_SECRET` فراخوانی می‌کند تا پیامک/پوش، بررسی پرداخت و صف رزرو اجرا شوند. pg_cron هم انقضا را انجام می‌دهد؛ عملیات انقضا idempotent است. خطای worker در لاگ محدود و بدون محتوای پیام/کلید ثبت می‌شود.
- پیش‌فرض ورود پیامکی خاموش است. بعد از تنظیم OnlinePayamak در `.env.app`، `PHONE_AUTH_ENABLED=true` را در آن و `ENABLE_PHONE_SIGNUP=true` را در `.env` سوپابیس قرار دهید. hook داخلی و secret هماهنگ از قبل در compose تعریف شده‌اند. `GOTRUE_SMS_AUTOCONFIRM` باید **false** بماند. `web` و `auth` را recreate و ارسال/اعتبارسنجی واقعی OTP را آزمایش کنید.
- SMTP واقعی را در `.env` سوپابیس کامل کنید. `SITE_URL` و allow-list آدرس تأیید/بازیابی باید دامنهٔ جدید باشد. تنظیمات پنل Supabase Cloud خودکار منتقل نمی‌شوند.
- در پنل زرین‌پال، دامنه و callback جدید `https://match-sho.com/api/payments/zarinpal/callback` را ثبت کنید. کلید در `.env.app` است؛ درگاه بدون تنظیم واقعی فعال نمی‌شود. کارت‌به‌کارت و اطلاعات مقصد از دیتابیس منتقل می‌شوند؛ یک تست ارسال/رد/اصلاح رسید با حساب‌های آزمایشی انجام دهید، بدون واریز واقعی.
- Firebase: دامنهٔ جدید را در تنظیمات مربوط به پروژه/کلید وب و در صورت استفاده در Authorized Domains تنظیم کنید؛ متغیرهای عمومی را قبل از build و credential سرور را فقط زمان اجرا بدهید. service worker روی ریشهٔ همین دامنه سرو می‌شود. مجوز و توکن پوش وابسته به origin هستند؛ روی دامنهٔ جدید از کاربران دوباره مجوز/ثبت دستگاه می‌خواهیم. انتقال دیتابیس به معنی انتقال مجوز مرورگر نیست.
- Middleware رزرو باشگاه و تقویم‌های بیرونی را از IP جدید تست کنید؛ محدودیت IP، DNS و خروجی اینترنت می‌توانند مانع باشند. سلف‌هاست جایگزین تنظیم واقعی سرویس‌های پیامک/بانکی نیست.

## ۷. دامنه، DNS و HTTPS

در پنل DNS فعلی دامنه (لزومی ندارد DNS provider را هم عوض کنید):

| نوع | نام | مقدار |
|---|---|---|
| A | `@` | `85.198.54.103` |
| A | `api` | `85.198.54.103` |
| CNAME | `www` | `match-sho.com` |

رکوردهای MX/TXT ایمیل را دست نزنید. رکورد A/CNAME متعارض Vercel را فقط برای همین hostها جایگزین کنید. اگر AAAA به سرور قبلی اشاره می‌کند و IPv6 سرور جدید ندارید، آن را برای این hostها بردارید. CAA محدودکننده باید صدور توسط CA مورد استفادهٔ Caddy را اجازه دهد. ابتدا TTL را پایین بیاورید و برای راه‌اندازی اولیه DNS-only بدون proxy/CDN استفاده کنید؛ سپس CDN را با TLS معتبر origin و بدون cache صفحات حساب/ادمین/API اضافه کنید.

کانفیگ فعلی apex و API را سرو می‌کند و برای `www` ریدایرکت HTTPS به apex دارد. رکورد DNS `www` هم باید تنظیم شود؛ CNAME به‌تنهایی بدون کانفیگ وب‌سرور کافی نیست.

سپس پس از آماده‌بودن داده و ایمیج:

```bash
bash deploy/migrate.sh jobs
bash deploy/stack.sh up -d web caddy scheduler
curl -fsS https://match-sho.com/api/health
bash deploy/stack.sh ps
bash deploy/stack.sh logs --tail=50 web caddy auth scheduler functions
```

Caddy با DNS صحیح و پورت‌های 80/443 باز، گواهی را خودکار می‌گیرد و تمدید می‌کند؛ دادهٔ `/data` را نگه دارید. خطای TLS را با `-k` به‌عنوان راه‌حل دائمی دور نزنید. برنامه روی سرور است و دامنه فقط از طریق DNS به آن می‌رسد؛ SSL و API هم باید جدا درست باشند.

## ۸. بررسی قبل از بازکردن رزرو و قطع سرویس قبلی

```bash
bash deploy/stack.sh exec -T db psql -X -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 < deploy/verify.sql
```

تعداد کاربران/رزروها/پرداخت‌ها/رسیدها و فایل‌ها را با snapshot نهایی مبدأ مقایسه کنید. سپس ثبت‌نام و تأیید ایمیل، ورود کاربر قدیمی، فراموشی رمز، پروفایل، تقویم زنده، رزرو، پرداخت، آپلود رسید، رد با علت/اصلاح، تأیید مدیر، استرداد، cron و اعلان‌ها را تست کنید. دسترسی بدون ورود و کاربر دیگر به رسید خصوصی باید رد شود؛ تنظیمات و تأیید واریز فقط مدیر. HTTP 200 health فقط زنده‌بودن Node را ثابت می‌کند، نه سلامت بانک یا دیتابیس.

در مرورگر بررسی کنید درخواست‌های تازه به `api.match-sho.com` می‌روند نه `*.supabase.co`. cookieهای قدیمی JWT معتبر روی مقصد ندارند؛ ورود مجدد طبیعی است. Cloud/Vercel را تا پایان تست و یک بازهٔ پایش نگه دارید، ولی نوشتن و worker قدیمی را دوباره روشن نکنید تا دو منبع داده مستقل نسازید.

## ۹. عملیات روزمره، بکاپ و rollback

```bash
bash deploy/backup.sh
# بعد از گرفتن بکاپ معتبر و ساخت image release جدید:
git pull --ff-only
bash deploy/migrate.sh apply
bash deploy/stack.sh up -d --no-deps web scheduler
```

در صورت تغییر env زمان اجرای Auth/Storage از `up -d --force-recreate SERVICE` استفاده کنید. secrets در لاگ چاپ نشوند. `backup.sh` snapshot منطقی دیتابیس، نقش‌ها، فایل‌های Storage، دادهٔ کلید دیتابیس و envهای محرمانه را در پوشهٔ خصوصی زیر `backups/` ذخیره و checksum می‌سازد. **همان دیسک بکاپ مستقل نیست**: خروجی را رمزگذاری و به فضای جدا با retention مشخص منتقل کنید. cron بکاپ روزانه را خودتان با مانیتور موفقیت تنظیم کنید؛ برنامه فایل قدیمی را خودکار حذف نمی‌کند.

بکاپ آنلاین فایل و SQL یک snapshot اتمیک مشترک نیست. برای بکاپ سازگار، نوشتن/upsert/delete را متوقف و workerها را تخلیه کنید یا از راهکار snapshot هماهنگ استفاده کنید؛ به backup نیمه‌کاره اعتماد نکنید. restore آزمایشی روی میزبان/volume جدا با **همان نسخه‌ها و کلیدها** انجام دهید: PostgreSQL از `database.dump` با `pg_restore`، نقش‌ها با بررسی تعارض نقش‌های داخلی، فایل‌ها در volume واقعی Storage و `db-config` به محل مربوط، سپس verify و تست عملی. بازیابیِ صرفاً database.dump بدون تصاویر، env و کلیدهای رمزنگاری کافی نیست. این backup مقصد با export فیلترشدهٔ Cloud یکی نیست؛ دستور restore Cloud را برای آن کپی نکنید.

Rollback برنامه: به image release قبلی برگردید؛ دیتابیس downgrade خودکار ندارد. اگر migration ناسازگار انجام شده، maintenance و restore برنامه‌ریزی‌شده لازم است. Rollback DNS به Vercel فقط وقتی امن است که نوشتن مقصد هنوز باز نشده باشد؛ بعد از رزرو/پرداخت جدید، بازگشت ساده باعث از دست‌رفتن یا دوشاخه‌شدن اطلاعات می‌شود و باید داده‌ها reconcile شوند. خاموش‌کردن/حذف Cloud فقط بعد از تأیید بکاپ، بازیابی و cutover موفق انجام شود.

Studio عمومی نیست. برای دسترسی مدیریتی از دستگاه خودتان:

```bash
ssh -L 8000:127.0.0.1:8000 YOUR_SSH_USER@85.198.54.103
```

سپس `http://127.0.0.1:8000` را با رمز تولیدشدهٔ پنل باز کنید. رمزها را به محیط عمومی ندهید. ارتقای Supabase مستقل از pull برنامه است؛ commit runtime و imageها را بدون مطالعهٔ changelog، backup و rehearsal عوض نکنید. این استقرار تک‌سرور high availability نیست.

## منابع رسمی

- [Supabase Docker](https://supabase.com/docs/guides/self-hosting/docker)
- [Restore from Platform](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
- [Copy Storage using S3](https://supabase.com/docs/guides/self-hosting/copy-from-platform-s3)
- [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)

## وضعیت بررسی

۶۹ تست در ۱۴ فایل پاس شدند؛ شش تست جدید شامل تولید کلید امن، اجرای همهٔ مایگریشن‌های واقعی با runner، تکرار امن، checksum، rollback و baseline بدون بازاجرای SQL هستند. تست‌ها برای محدودکردن مصرف PostgreSQL/WASM ترتیبی اجرا می‌شوند. typecheck و lint بدون خطا بودند (دو هشدار قدیمی تصویر باقی است). build عادی و build با `DOCKER_BUILD=true` و دو worker هر دو موفق شدند.

خروجی standalone روی میزبان ویندوز با کپی public/static اجرا شد: health، SVG برند، favicon و تصویر اشتراک‌گذاری HTTP 200 و worker بدون کلید HTTP 401 دادند. این خروجی ویندوز artifact انتشار Linux نیست؛ برای انتشار از Docker build استفاده کنید. کانفیگ compose با فایل رسمی همان commit بررسی شد: پورت‌ها loopback، build args فقط عمومی، کلید خصوصی وب مطابق gateway و بدون تداخل با کلید opaque upstream بود. syntax تمام اسکریپت‌های Bash بررسی شد.

به‌روزرسانی ۲۳ اکتبر ۲۰۲۶: تعداد تست‌ها به **۷۶ در ۱۶ فایل** رسید. [اجرای GitHub روی commit 2159071](https://github.com/omid-d3v/padel-club/actions/runs/40016678179) علاوه بر lint/typecheck/test، **Docker build واقعی Linux و smoke test کانتینر** را با تنظیمات عمومی آزمایشی با موفقیت انجام داد؛ job انتشار عمداً skipped بود. قواعد exporter، شناسه ایمیج آفلاین، گیت انتشار و روتر تقویم بدون دانلود خارجی هم تست دارند.

**محدودیت:** Docker Desktop محلی قبلاً با EOF/قطع API خاموش شد، اما بررسی image برنامه اکنون روی GitHub موفق است. اجرای کامل کانتینرهای Supabase/Caddy، بسته انتقال زیرساخت، صدور TLS، دسترسی واقعی میرور از ایران و restore واقعی Cloud هنوز تأیید نشده‌اند. قبل از cutover این موارد باید روی سرور مقصد تست شوند. هیچ رکورد DNS، دیتابیس Cloud، تنظیم Vercel یا دادهٔ سرور مقصد در این کار تغییر نکرده است.
