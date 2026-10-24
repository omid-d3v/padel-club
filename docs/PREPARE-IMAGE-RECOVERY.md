# رفع No such image بعد از بارگذاری بسته

در بعضی ترکیب‌های image store، خروجی `.Id` در Docker گیت‌هاب با شناسه‌ای که Docker مقصد پس از load گزارش می‌کند متفاوت است. بسته از قبل tagهای دقیق `matchsho-infra:sha256-...` را دارد. map و Node اکنون همین tagهای آرشیو را با `pull_policy: never` استفاده می‌کنند، نه ID وابسته به engine مبدأ. این نام tag یک digest رجیستری نیست؛ صحت انتقال همچنان با SHA256SUMS بسته بررسی می‌شود.

برای بسته‌های جدید fix خودکار در package-infra اعمال می‌شود. Docker و backend آن را برای این خطا عوض یا restart نکنید؛ هیچ image/data volume لازم نیست حذف شود.

## بازیابی بسته قدیمی بدون دانلود مجدد

این مسیر فقط برای شکست **اولین prepare قبل از ایجاد هر دو فایل env** است. اگر env یا دیتابیس از قبل وجود دارد، recovery عمداً متوقف می‌شود؛ هیچ credentialای را برای عبور از guard حذف نکنید.

دو فایل اصلاح‌شده `deploy/recover-prepare.sh` و `deploy/offline-images.mjs` را با SSH تأییدشده در `/opt/matchsho/incoming/ORIGINAL_SHA/repair/` بگذارید. به‌عنوان کاربر matchsho:

```bash
bash /opt/matchsho/incoming/ORIGINAL_SHA/repair/recover-prepare.sh ORIGINAL_SHA YOUR_REAL_EMAIL
```

اسکریپت قفل انتشار می‌گیرد، checksumهای بسته، revision رسمی upstream و تطابق فایل‌های استخراج‌شده را بررسی می‌کند. وجود current، production-ready، credentials، PG_VERSION یا کانتینرهای پروژه باعث توقف است. همه tagها و معماری قبل از تغییر map بررسی می‌شوند. map قبلی زیر `shared/runtime/image-repair.*` نگه داشته می‌شود؛ خود فایل‌های آرشیو و checksum تغییر نمی‌کنند. تولید env فقط با `wx` و mode 600، داخل Node موجود و بدون اینترنت انجام می‌شود. سپس compose فقط با `config --quiet` اعتبارسنجی می‌شود و current تنظیم می‌شود. هیچ سرویس production یا دیتابیس شروع نمی‌شود.

اگر recovery بعد از ساخت env متوقف شد، دوباره با حذف env اجرا نکنید؛ مرحله ناموفق را جدا با حفظ secrets بررسی کنید.

## هم‌تراز کردن کد آماده با main اصلاح‌شده

بسته اول ممکن است SHA قدیمی داشته باشد. پیش از اولین deploy، کد commit اصلاح‌شده را به‌صورت source archive کوچک به یک release جدید منتقل و `release.sh NEW_SHA prepare` اجرا کنید. وقتی shared/app.env موجود باشد، این مسیر تنظیمات موجود را حفظ و از mapهای آماده استفاده می‌کند و نیاز به انتقال دوباره ایمیج‌ها ندارد. source archive باید از `git archive` همان commit معتبر باشد، SHA و checksum آن در مقصد بررسی و release قبلی حفظ شود. اجرای همان workflow معمول prepare بدون زیرساخت هم چنین کدی را می‌فرستد، اما setup آزمایشی runner ممکن است Node/upstream را در CI دریافت کند.

فقط بعد از موفقیت این مرحله، workflow با `task=deploy` برای همان main اجرا شود. deploy اول صرفاً ایمیج سایت را تحویل می‌دهد؛ Cloud DB، migration history و Storage باید قبل از `activate.sh` منتقل و تطبیق داده شوند. AUTO_DEPLOY همچنان false بماند.
