# تغییر IP سرور بدون نصب مجدد

سرور همان Ubuntu قبلی است؛ IP مقصد اکنون **85.198.54.103** است. تغییر IP به‌تنهایی دلیل نصب مجدد Docker، اجرای bootstrap، حذف runtime، ساخت مجدد env یا تعویض کلیدهای Supabase نیست. سرور آلمان و workflow آفلاین فقط مسیر جایگزین‌اند؛ برای مسیر مستقیم، workflow **Test, build and deploy MatchSho** استفاده شود.

## ۱. Variables گیت‌هاب

در [Repository variables](https://github.com/omid-d3v/padel-club/settings/variables/actions):

| نام | مقدار |
|---|---|
| `DEPLOY_HOST` | `85.198.54.103` |
| `DEPLOY_USER` | `matchsho`، نه root |
| `DEPLOY_PORT` | `22` |
| `ACME_EMAIL` | همان ایمیل واقعی قبلی؛ تغییر لازم نیست |
| `AUTO_DEPLOY` | تا پایان انتقال و activate برابر `false` |

در مسیر مستقیم، `OFFLINE_PUBLIC_ENV` خوانده نمی‌شود؛ حذفش لازم نیست. workflow فقط تنظیمات عمومی build را از env موجود سرور می‌خواند، نه رمز دیتابیس یا service_role.

## ۲. Secret کلید میزبان را برای IP جدید به‌روز کنید

در **کنسول معتبر آروان، روی همان سرور ایران** اجرا کنید:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
awk '{print "85.198.54.103 " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
```

تمام خط دوم، با قالب `85.198.54.103 ssh-ed25519 AAAA...`، مقدار جدید **`DEPLOY_KNOWN_HOSTS`** در [Repository secrets](https://github.com/omid-d3v/padel-club/settings/secrets/actions) است؛ prompt و متن دستور را کپی نکنید. اگر پورت غیر 22 باشد نام میزبان باید `[IP]:PORT` باشد. این کلید عمومی است، ولی منبع آن باید معتبر باشد. تایم‌اوت را با خاموش‌کردن StrictHostKeyChecking حل نکنید.

**`DEPLOY_SSH_KEY` تغییر نمی‌کند.** همان کلید خصوصی قبلی با کاربر matchsho روی همین سرور کار می‌کند. اگر Secret قبلاً درست ثبت شده، به آن دست نزنید. فقط در صورت نیاز به ثبت دوباره، در PowerShell کامپیوتر:

```powershell
Get-Content -Raw "$env:USERPROFILE/.ssh/matchsho-ci" | Set-Clipboard
```

فقط در Secret هم‌نام paste و سپس `Set-Clipboard -Value ""` اجرا کنید. کلید خصوصی را در چت، Variable یا روی سرور قرار ندهید. هیچ کلید جدیدی لازم نیست تولید شود.

## ۳. اول تست اتصال بدون build یا تغییر سرور

[Actions → Test, build and deploy MatchSho](https://github.com/omid-d3v/padel-club/actions/workflows/production.yml) → Run workflow → `main` → `task=check-connection`.

فقط job اتصال اجرا می‌شود: هویت میزبان با known_hosts، دسترسی کلید، مسیر incoming، Docker و معماری بررسی می‌شوند. env تولید، تصویر دانلود، migration اجرا یا کانتینری راه‌اندازی نمی‌شود. خطای «known_hosts must contain...» یعنی Secret هنوز برای IP قبلی است؛ خطای Permission denied یعنی کلید/کاربر باید بررسی شود. موفقیت curl سرور به GitHub، جای این تست جهت معکوس را نمی‌گیرد.

## ۴. ادامه نصب موجود

اگر تست گفت **No prepared release yet**، همان workflow را با `task=prepare` و `include_infrastructure=true` اجرا کنید. این گزینه به‌جای دانلود چندساعته روی کامپیوتر، ایمیج‌ها را روی GitHub می‌گیرد و مستقیماً به ایران می‌فرستد. بازشدن github.com دسترسی رجیستری‌های Docker را ثابت نمی‌کند؛ برای اولین بار گزینه انتقال زیرساخت روشن بماند.

اگر current و shared از قبل آماده‌اند، صرفاً به دلیل IP جدید prepare را تکرار نکنید. ابتدا وضعیت همان release را بررسی کنید. خروجی `Production activated: no` یعنی هنوز نباید AUTO_DEPLOY را روشن کرد.

برای اولین سایت: بعد از prepare، `task=deploy` روی **همان commit** فقط ایمیج اول را تحویل می‌دهد. سپس [انتقال دیتابیس، تاریخچه و Storage](SELF-HOSTING.md) را انجام دهید؛ تنها پس از بررسی واقعی داده‌ها `deploy/activate.sh` اجرا شود. تا پیش از مهاجرت Cloud، activate را دور نزنید و marker را دستی نسازید.

اگر production قبلاً فعال شده است، پس از موفقیت check-connection می‌توانید deploy عادی را اجرا کنید. انتشار افزایشی بکاپ و migration دارد؛ rollback SQL خودکار ندارد. AUTO_DEPLOY فقط پس از تأیید سلامت سایت و داده‌ها true شود.

## ۵. دامنه و سرویس‌های وابسته

- اگر رکورد `A` برای `@` یا `api` **قبلاً به IP قبلی همین سرور اشاره داشته**، مقدارش را به `85.198.54.103` تغییر دهید. اگر سایت هنوز روی Vercel است، رکورد اصلی را تا پایان مهاجرت و تست تغییر ندهید.
- CNAME `www → match-sho.com`، رکوردهای MX/TXT و دامنه‌های داخل env تغییری نمی‌خواهند. وجود AAAA متعارض را هم بررسی کنید.
- اگر در سرویس خارجی allow-list آی‌پی خروجی دارید، IP خروجی جدید را با ارائه‌دهنده تطبیق دهید؛ از برابر بودنش با IP ورودی فرض نسازید.
- اتصال‌های SSH/SCP دستی از این پس از IP جدید استفاده کنند. اثرانگشت میزبان را با خروجی کنسول تطبیق دهید؛ هشدار تغییر میزبان را کورکورانه حذف نکنید.

این تغییر به دیتابیس Cloud، DNS یا داده‌های مقصد دست نمی‌زند؛ آن مراحل جداگانه‌اند.
