# از سرور خام ایران تا انتشار خودکار مچ شو

مقصد این راهنما: Ubuntu LTS **amd64**، دو هسته/۴GB RAM، IP `85.198.55.121`، سایت `match-sho.com`، API `api.match-sho.com`، مخزن `omid-d3v/padel-club` و شاخه `main`.
این فایل دستورالعمل است؛ سرور، DNS، GitHub Secrets و انتقال داده هنوز با نوشتن این فایل انجام نشده‌اند. رمز یا کلید خصوصی را در چت/گیت نفرستید.

## نقشه راه و ظرفیت

```text
push main → lint + typecheck + tests → Docker build روی GitHub → smoke test
          → SSH/SCP ایمیج و کد → بکاپ → migration افزایشی → اجرای نسخه جدید

اولین بار: prepare → تولید کلیدها → انتقال Cloud DB و Storage → deploy (فقط تحویل ایمیج)
                 → DNS + activate دستی → تست رزرو → روشن‌کردن AUTO_DEPLOY
```

۴GB/دو هسته حداقل رسمی Supabase است، نه تضمین ظرفیت همراه Next.js. حداقل SSD رسمی ۴۰GB است؛ برای فایل رسید، بکاپ و دو نسخه ایمیج **۸۰GB یا بیشتر** حاشیه عملی مناسب‌تری دارد. قبل از هر انتشار فضای آزاد را ببینید. Analytics/Logflare در این نسخه روشن نیست. روی سرور build نمی‌کنیم. اگر RAM دائماً کم بود یا OOM رخ داد، RAM را افزایش دهید؛ swap جای رم واقعی نیست.

مسیر انتخابی نیازی به pull از GHCR، اتصال گیتِ سرور به ریپو، npm روی سرور یا توکن GitHub روی سرور ندارد. GitHub کد و ایمیج‌ها را **به** سرور می‌فرستد. گزینه prepare می‌تواند همه ایمیج‌های زیرساخت را هم منتقل کند. دسترسی خروجی به DNS، NTP، سرویس صدور/تمدید SSL، پیامک/بانک/SMTP/FCM و سایت زمین‌ها همچنان لازم است؛ این راهکار قطع کامل اینترنت را حل نمی‌کند. دسترسی ورودی SSH از runnerهای GitHub هم ضروری است.

## ۱. اولین ورود و بررسی سرور

روی **PowerShell کامپیوتر خودتان**:

```powershell
ssh root@85.198.55.121
```

رمز اولیه را از پنل شرکت سرور بگیرید. اگر نام کاربر اولیه `ubuntu` است، با همان وارد شوید و برای دستورهای روت `sudo -i` بزنید. اثرانگشت SSH را با کنسول معتبر شرکت سرور تطبیق دهید؛ پیام ناشناخته را کورکورانه تأیید نکنید.

روی **سرور**:

```bash
cat /etc/os-release
uname -m
free -h
df -h /
timedatectl status
```

انتظار: Ubuntu 22.04/24.04/26.04 LTS، معماری `x86_64`. اسکریپت روی نسخه/معماری دیگر متوقف می‌شود؛ ایمیج CI این راهنما `linux/amd64` است. برای شروع تازه 24.04 LTS انتخاب محافظه‌کارانه‌ای است. ساعت/NTP صحیح برای JWT و TLS لازم است. در پنل شبکه سرور خروجی DNS و HTTPS را مسدود نکنید. دستورهای Linux را در PowerShell اجرا نکنید.

## ۲. ساخت کلید اختصاصی GitHub → سرور

روی **PowerShell کامپیوتر**، یک بار، بدون overwrite کلید قدیمی:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE/.ssh" | Out-Null
Test-Path "$env:USERPROFILE/.ssh/matchsho-ci"
```

اگر خروجی `False` است:

```powershell
ssh-keygen -t ed25519 -C "matchsho-github-actions" -f "$env:USERPROFILE/.ssh/matchsho-ci"
```

برای این کلید ماشینی، passphrase را دو بار خالی Enter کنید؛ این کلید فقط مخصوص همین انتشار است. فایل بدون `.pub` خصوصی است. کلید حساب شخصی‌تان را در GitHub نگذارید. هر کس این کلید را داشته باشد، به‌واسطه Docker قدرت تقریباً root روی سرور دارد.

از پوشه همین پروژه روی کامپیوتر:

```powershell
cd C:/Users/hp/Desktop/Dev/padel-club
git pull --ff-only origin main
scp deploy/bootstrap-ubuntu.sh root@85.198.55.121:/tmp/matchsho-bootstrap.sh
scp "$env:USERPROFILE/.ssh/matchsho-ci.pub" root@85.198.55.121:/tmp/matchsho-ci.pub
```

سرور برای این مرحله لازم نیست به GitHub وصل شود؛ فایل اسکریپت و **کلید عمومی** از کامپیوتر شما می‌رسند. اگر SSH شما پورت دیگری دارد، در ssh گزینه `-p PORT` و در scp گزینه `-P PORT` اضافه کنید.

## ۳. نصب Docker و میرور، بدون دست‌کاری سرویس فعلی

ابتدا فایل `/tmp/matchsho-bootstrap.sh` را بخوانید. روی **سرور تازه** با root:

```bash
less /tmp/matchsho-bootstrap.sh
bash /tmp/matchsho-bootstrap.sh --arvan-apt --ubuntu-docker --docker-mirror
```

این مسیر مناسب شبکه محدود ایران است:

- فقط URL آرشیوهای Ubuntu را به `http://mirror.arvancloud.ir/ubuntu` تغییر می‌دهد؛ suite/component و امضای رسمی Ubuntu حفظ می‌شوند و نسخه قبلی فایل‌ها در `/var/backups/matchsho-apt-*` می‌ماند. `trusted=yes` یا دورزدن امضا نداریم. پشتیبانی suite فعلی را با `apt-get update` بررسی کنید؛ خطای نبود Release یا امضای نامعتبر را نادیده نگیرید.
- Docker و `docker-compose-v2` را از بسته‌های Ubuntu می‌گیرد، تا به مخزن نصب Docker.com وابسته نباشید. Compose باید **۲.۲۴.۴ یا جدیدتر** باشد؛ اسکریپت بررسی و در صورت قدیمی‌بودن متوقف می‌شود. اگر بسته در universe نسخه شما موجود نبود، ابتدا فعال‌بودن universe را بررسی کنید؛ بسته تصادفی دانلود نکنید.
- میرور رسمی `https://docker.arvancloud.ir` را با حفظ تنظیمات دیگر daemon اضافه می‌کند؛ **insecure registry و غیرفعال‌کردن TLS ندارد**. لازم نیست از این میرور استفاده کنید تا بسته آفلاین CI کار کند.
- کاربر `matchsho` و مسیرهای `/opt/matchsho` می‌سازد؛ کاربر sudo عمومی ندارد، ولی گروه Docker معادل root است. برای کلید CI، PTY و forwarding غیرفعال است. فایل authorized_keys موجود overwrite نمی‌شود.
- DNS، فایروال، تنظیمات ورود SSH و دیتابیس را تغییر نمی‌دهد. روی سرور live دوباره bootstrap اجرا نکنید.

اگر به مخزن رسمی Docker دسترسی دارید، به‌جای فرمان بالا می‌توانید مسیر رسمی را انتخاب کنید:

```bash
bash /tmp/matchsho-bootstrap.sh --arvan-apt --docker-mirror
```

این مسیر کلید رسمی Docker را با HTTPS و repository دارای `Signed-By` نصب می‌کند. اگر اتصال به Docker.com شکست خورد، پس از بررسی خطا همان اسکریپت را با `--ubuntu-docker` اجرا کنید. **اگر docker.sources ایجاد شده ولی مخزنش غیرقابل دسترس است، قبل از تغییر مسیر آن فایل را به نام backup خارج از sources.list.d منتقل کنید**؛ دو نصب ناسازگار را مخلوط نکنید. آموزش خام نصب Docker جای تغییر نسخه production را نمی‌گیرد.

بررسی روی سرور:

```bash
docker compose version
docker info >/dev/null
systemctl is-enabled docker
```

برای تست اختیاری میرور، `docker pull hello-world` بزنید. خطای میرور مانع روش «انتقال همه ایمیج‌ها با CI» نیست. میرور Ubuntu، مخزن بسته Docker Engine و mirror ایمیج Docker سه چیز متفاوت‌اند.

## ۴. امنیت شبکه و تست ورود کلیدی

در **PowerShell یک پنجره جدید**، بدون بستن جلسه root:

```powershell
ssh -i "$env:USERPROFILE/.ssh/matchsho-ci" matchsho@85.198.55.121 "docker info >/dev/null && id"
```

این کلید عمداً PTY ندارد؛ برای دستورهای تعاملی سرور از حساب مدیریتی خودتان استفاده کنید. روی سرور root، برای کار تعاملی به کاربر اپلیکیشن بروید: `sudo -iu matchsho`؛ خروج با `exit`.

در فایروال شبکه شرکت سرور TCP **22، 80، 443** را باز کنید. 22 را با پورت واقعی SSH عوض کنید. برای CI باید runner به SSH برسد؛ فقط whitelist کردن IP خانگی باعث شکست CI می‌شود. اگر بازگذاشتن SSH برای اینترنت را نمی‌خواهید، runner با IP ثابت یا VPN/runner جدا لازم است؛ runner روی production توصیه این راهنما نیست. احراز هویت کلیدی و محدودیت حساب را حفظ کنید.

فقط پس از دانستن پورت SSH و تست دوم، روی سرور root:

```bash
ss -lntp
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw enable
ufw status verbose
```

SSH را دوباره از پنجره جدید تست کنید. اگر پورت 22 نیست، **قبل از enable پورت واقعی را allow کنید**. root/password login را تا وقتی کلید مدیریتی مستقل و کنسول rescue را امتحان نکرده‌اید قطع نکنید. بعداً با حساب مدیریتی امن و `sshd -t` اعتبارسنجی و دسترسی رمز را محدود کنید. کلید محدود CI جای کلید مدیریتی شخصی نیست.

Docker بعضی قواعد UFW را دور می‌زند؛ پورت‌های **5432/6543/8000/3000 را در فایروال شبکه باز نکنید**. compose فقط 80/443 عمومی می‌کند و پورت DB/API مدیریتی روی loopback است. Studio عمومی نیست.

اختیاری، اگر swap ندارید و فایل زیر موجود نیست، روی فایل‌سیستم ext4 با فضای کافی **root** می‌توانید ۲GB swap بسازید:

```bash
swapon --show
test ! -e /swapfile-matchsho
fallocate -l 2G /swapfile-matchsho
chmod 600 /swapfile-matchsho
mkswap /swapfile-matchsho
swapon /swapfile-matchsho
printf '/swapfile-matchsho none swap sw 0 0\n' >> /etc/fstab
swapon --show
```

اگر test خطا داد ادامه ندهید/overwrite نکنید. این بلوک فقط یک بار؛ روی Btrfs یا سیستم دارای swap متفاوت، طبق راهنمای همان سیستم عمل کنید. swap فقط حاشیه اضطراری است، نه افزایش ظرفیت production.

## ۵. تنظیم GitHub؛ دو Secret و چند Variable

ابتدا کلید میزبان SSH را از **کنسول معتبر سرور، root** بگیرید:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
awk '{print "85.198.55.121 " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
```

خروجی دوم یک خط `85.198.55.121 ssh-ed25519 AAAA...` است؛ همین را برای known_hosts استفاده کنید. اگر پورت SSH غیر 22 است، فیلد اول باید `[85.198.55.121]:PORT` باشد. public key میزبان محرمانه نیست، اما باید از مسیر معتبر تأیید شده باشد. در CI خودکار `ssh-keyscan` نمی‌کنیم و StrictHostKeyChecking روشن است.

در ریپو GitHub → **Settings → Secrets and variables → Actions**، بخش **Repository secrets**:

| Secret | از کجا؟ |
|---|---|
| `DEPLOY_SSH_KEY` | کل محتوای فایل خصوصی `C:/Users/hp/.ssh/matchsho-ci`، شامل BEGIN/END |
| `DEPLOY_KNOWN_HOSTS` | همان خط تأییدشده کلید عمومی میزبان |

برای کپی مستقیم کلید خصوصی در PowerShell، بدون چاپ در ترمینال:

```powershell
Get-Content -Raw "$env:USERPROFILE/.ssh/matchsho-ci" | Set-Clipboard
```

فقط در Secret GitHub paste کنید، نه چت یا Variable. پس از ثبت، clipboard را پاک کنید: `Set-Clipboard -Value ""`. فایل خصوصی را روی سرور upload نکنید.

در بخش **Repository variables**:

| Variable | مقدار |
|---|---|
| `DEPLOY_HOST` | `85.198.55.121` |
| `DEPLOY_USER` | `matchsho` |
| `DEPLOY_PORT` | `22` یا پورت واقعی |
| `ACME_EMAIL` | ایمیل واقعی تحت کنترل شما؛ برای اطلاعیه گواهی، نه SMTP password |
| `AUTO_DEPLOY` | فعلاً `false`؛ بعد از انتقال و تست `true` |

مقادیر بالا repository-level باشند. secret سوپابیس، DB password، Firebase private key، پیامک و درگاه **به GitHub لازم نیست**. CI فقط ۹ متغیر عمومی allow-list شده `NEXT_PUBLIC_*` را از سرور می‌خواند؛ مقدار کلید عمومی جدید هم خودکار منتقل می‌شود.

Workflow به Actions رسمی با commit ثابت، مجوز `contents: read`، تست قبل از deploy، قفل و known_hosts ثابت مجهز است. secret به pull request داده نمی‌شود. در PR و pushهایی که AUTO_DEPLOY هنوز روشن نیست، Dockerfile با کلید عمومی تصادفیِ آزمایشی build و کانتینر smoke-test می‌شود؛ این ایمیج برای production تحویل نمی‌شود. پس از فعال‌سازی، ایمیج production با تنظیمات عمومی واقعی سرور build و دوباره smoke-test می‌شود. هر کس اختیار تغییر main/workflow داشته باشد می‌تواند از کلید CI استفاده کند؛ دسترسی write را محدود و 2FA و branch protection فعال کنید. در Settings → Rules/Branches، برای main بررسی PR و checkهای این workflow را الزامی کنید. برای جلوگیری از خطای نام check، ابتدا یک اجرای checks انجام شود و نام آن را از UI انتخاب کنید.

به‌طور پیش‌فرض از repository secrets استفاده می‌شود تا ریپوی private با GitHub Free هم نیازمند Environment پولی نشود. اگر پلن شما پشتیبانی می‌کند، می‌توانید زیر job `release`، `environment: production` اضافه و روی آن reviewer/محدودیت شاخه بگذارید؛ این تصمیم باعث انتظار برای تأیید انتشار می‌شود.

## ۶. prepare: دریافت زیرساخت و ساخت خودکار env

GitHub → **Actions → Test, build and deploy MatchSho → Run workflow**:

1. Branch: `main`.
2. `task`: **prepare**.
3. `include_infrastructure`: **true** بماند.
4. Run workflow و منتظر checks سپس release بمانید.

این اجرا کد commit دقیق، Docker Compose رسمی commit-pinned سوپابیس، و همه ایمیج‌های لازم Node/Supabase/Caddy را با SSH می‌فرستد؛ بسته اولیه بزرگ است و ممکن است طول بکشد. هیچ کانتینر production راه نمی‌افتد، دیتای Cloud دست نمی‌خورد و دامنه عوض نمی‌شود. `Docker save/load` digest رجیستری را حفظ نمی‌کند؛ map جدا با **شناسه محتوایی ایمیج** ساخته می‌شود تا سرور حتی برای resolve کردن digest به رجیستری نیاز نداشته باشد.

روتر مخصوص `calendar-sync` در `deploy/edge-main` وابستگی دانلود JSR/npm ندارد. فقط مسیر تقویم را می‌پذیرد؛ worker همچنان توکن را در Vault تأیید می‌کند. این تغییر، مجوز عمومی به سایر Edge Functionها نیست.

پس از سبز شدن prepare، در جلسه مدیریتی سرور:

```bash
sudo -iu matchsho
cd /opt/matchsho/current
bash deploy/stack.sh config --quiet
```

ساختار پایدار:

```text
/opt/matchsho/
  current -> releases/<commit SHA>
  releases/<SHA>/                 کد، Caddyfile، migration و worker همان نسخه
  incoming/<SHA>/                 بسته تحویلی (برای بازیابی؛ خودکار پاک نمی‌شود)
  shared/app.env                 فقط runtime برنامه، mode 600
  shared/runtime/supabase/docker/.env
  shared/runtime/supabase/docker/volumes/   DB و Storage دائمی
  shared/runtime/infra-images.json         فقط شناسه ایمیج‌ها، بدون secret
  shared/runtime/app-image.env            نسخه فعال برنامه، بعد از activate
  shared/backups/                 بکاپ محرمانه؛ نسخه خارج سرور لازم است
```

لینک runtime/env در هر release به shared اشاره می‌کند؛ عوض‌شدن نسخه دیتابیس خالی جدید نمی‌سازد. named volumeهای رسمی DB config و Caddy هم با پروژه ثابت `matchsho` حفظ می‌شوند. این فایل‌ها را جابه‌جا/پاک نکنید و `down -v`/prune/reset اجرا نکنید.

خودکار تولید می‌شود: رمز دیتابیس، رمز Studio، JWT signing secret، anon/service_role هماهنگ، کلیدهای encryption، S3، cron، Vault worker، hook پیامک، URLهای دامنه و connectionهای داخلی. **هیچ‌کدام را دستی از Cloud کپی نکنید و setup را برای «تازه‌سازی رمز» تکرار نکنید.** کلید جدید باعث ورود دوباره کاربران می‌شود؛ حساب/ID/رمز حساب کاربر در مهاجرت حفظ می‌شود.

اگر prepare نیمه‌کاره شکست خورد، لاگ و state را بررسی کنید؛ اسکریپت release موجود را overwrite نمی‌کند. مسیر دارای داده را حذف نکنید. رفع مرحله ناقص و ادامه نصب با حفظ credentials لازم است. برای اجرای موفق prepare روی commit دیگر، قبل از production می‌توان prepare تازه اجرا کرد و همان shared را نگه داشت؛ بعد از activate آماده‌سازی مجدد زیرساخت مسدود است.

## ۷. چه envهایی واقعاً باید از پنل سرویس‌ها بگیرید؟

با `nano /opt/matchsho/shared/app.env` تنظیم کنید. اگر nano نصب نیست `vi` یا از root `apt-get install nano`؛ فایل‌ها را در GitHub آپلود نکنید. فایل Supabase جداست: `/opt/matchsho/shared/runtime/supabase/docker/.env`.

| سرویس | تنظیم و محل دریافت |
|---|---|
| ایمیل ورود/بازیابی | در `.env` سوپابیس: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME` از ارائه‌دهنده SMTP؛ دامنه فرستنده و SPF/DKIM را در همان سرویس تأیید کنید. سرور ایمیل نمونه upstream واقعی نیست. |
| OTP و اعلان پیامکی | در `app.env`: `ONLINEPAYAMAK_API_KEY`, `ONLINEPAYAMAK_SENDER`, `ONLINEPAYAMAK_OTP_TEMPLATE` از پنل آنلاین‌پیامک، شماره‌های مدیر در `ADMIN_NOTIFICATION_PHONES`؛ پس از تست واقعی `PHONE_AUTH_ENABLED=true` و در فایل Supabase `ENABLE_PHONE_SIGNUP=true`. autoconfirm خاموش بماند. |
| زرین‌پال | `ZARINPAL_MERCHANT_ID` از پنل پذیرنده، callback `https://match-sho.com/api/payments/zarinpal/callback` و ثبت دامنه؛ `ZARINPAL_SANDBOX=false` برای واقعی. تا آماده نیست، روش را در پنل سایت فعال نکنید. |
| کارت‌به‌کارت | شماره/نام کارت و روشن/خاموش در `/admin/settings`؛ در DB قبلی است و با انتقال حفظ می‌شود. بررسی رسید در `/admin/payments`. |
| Firebase | شش متغیر عمومی `NEXT_PUBLIC_FIREBASE_*` از Firebase Console و Web Push/VAPID؛ `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` از service account، **فقط روی سرور**. دسترسی FCM از IP ایران را آزمایش کنید. |
| اتصال رزرو | اگر integration دارای credential است، `BOOKING_PROVIDERS_JSON` از تنظیمات/ارائه‌دهنده واقعی؛ مقدار نمونه سرویس رزرو واقعی نمی‌سازد. |

رمزهای این سرویس‌ها قابل حدس‌زدن/تولید از طرف ما نیستند. کلید API سوپابیس جدید برای سایت، Postgres password و hook secret از قبل **خودکار و هماهنگ** هستند. تنظیمات Auth/SMTP/Hook از پنل Cloud با SQL منتقل نمی‌شوند.

مقدارهای public را ساده و تک‌خطی بدون quote، `$` یا command substitution بنویسید؛ exporter در غیر این صورت متوقف می‌شود. private key Firebase را طبق [راهنمای اعلان پروژه](BOOKING-OPERATIONS-NOTIFICATIONS.md) با `\n` نگه دارید؛ multiline واقعی در env ننویسید. از `source app.env` استفاده نکنید. برای secretهای دارای `$` قواعد literal تک‌quote Docker Compose را رعایت کنید و `config --quiet` بزنید، نه چاپ config حاوی secret.

تغییر env خصوصی نیاز به recreate سرویس مربوط دارد، نه build. تغییر هر `NEXT_PUBLIC_*` نیازمند **build و deploy مجدد** است؛ CI از روی سرور مقدار تازه را می‌خواند. قبل از اولین deploy این بخش را کامل کنید.

## ۸. تحویل اولین ایمیج، بدون روشن‌کردن سایت خالی

پس از تنظیم env، همان workflow را روی همان main اجرا کنید: `task=deploy`. include_infrastructure در deploy اثری ندارد.

CI این بار Dockerfile واقعی را build می‌کند، health و فایل favicon را داخل کانتینر امتحان می‌کند و ایمیج را به سرور می‌فرستد. چون `production-ready` هنوز نیست، **فقط فایل را تحویل می‌دهد و چیزی منتشر نمی‌کند**. تا اولین activate، commit prepare و deploy باید یکی باشد؛ وسط انتقال روی main تغییر جدید ندهید. خطای «Prepare this exact commit» یعنی نسخه‌ها یکی نیستند؛ با حفظ shared، prepare نسخه جدید لازم است.

## ۹. انتقال دیتابیس و فایل‌ها؛ قبل از DNS اصلی

این حساس‌ترین بخش است؛ خودکار به Cloud وصل و داده را overwrite نمی‌کنیم. فایل [SELF-HOSTING.md بخش‌های ۴ و ۵](SELF-HOSTING.md#۴-انتقال-دیتابیس-cloud-و-تاریخچهٔ-مایگریشن) فرمان‌های export/restore/history و انتقال S3 را دارد. مراحل را با هم اجرا کنید؛ migration جای بکاپ نیست.

روی سرور، کاربر `matchsho`، پوشه current:

```bash
cd /opt/matchsho/current
bash deploy/stack.sh up -d --no-build --pull never db
bash deploy/stack.sh ps
```

ابتدا فقط دیتابیس مقصد bootstrap می‌شود؛ انتظار برای healthy. **برای انتقال سایت فعلی، اینجا `migrate.sh apply` نزنید.** DB باید خالیِ مقصد باشد. در نصب بدون بسته زیرساخت، پیش از این مرحله `stack.sh pull` سرویس‌های زیرساخت طبق راهنمای قبلی لازم است.

دریافت اطلاعات مبدأ:

1. Supabase Cloud → پروژه فعلی → **Connect**: connection string دیتابیس، ترجیحاً direct یا session pooler سازگار IPv4. رمز DB از تنظیمات Database است؛ کلید anon/service_role پسورد DB نیست. رمز را URL-encode کنید. اگر رمز را ندارید، reset روی سرویس live می‌تواند اتصال فعلی را قطع کند؛ بدون برنامه reset نکنید.
2. از کامپیوتر/ماشین امن دارای Docker، `psql` و CLI پین‌شده، dumpهای **roles/schema/data + history.csv** را طبق راهنمای قبلی بگیرید؛ raw full Cloud dump جای این خروجی فیلترشده نیست. نسخه Postgres و افزونه‌ها را مقایسه کنید. dump حتماً `auth.users` را شامل شود.
3. فایل‌ها را با SCP به `/opt/matchsho/shared/backups/cloud-final/` منتقل کنید؛ کاربر matchsho باید مالک باشد. مسیر `backups` داخل current به همین shared اشاره می‌کند.
4. در مقصد restore تراکنشی انجام دهید. تاریخچه را وارد و `bash deploy/migrate.sh baseline-cloud` اجرا کنید؛ همه نسخه‌های checkout باید در تاریخچه مبدأ باشند. خطا را با جعل history یا اجرای دوباره SQLهای قدیمی دور نزنید.
5. سپس `bash deploy/migrate.sh apply` و طبق راهنمای قبلی سرویس‌های API/Storage را راه بیندازید. API می‌تواند قبل از سایت روی زیر دامنه `api` به سرور متصل شود و Caddy برای آن SSL بگیرد.
6. فایل‌های **واقعی Storage** را جدا با rclone copy/S3 یا روش API پشتیبانی‌شده انتقال دهید؛ metadata جدول storage.objects کافی نیست. رسیدهای پرداخت private باقی بمانند. sync با `--delete` نزنید. همه bucketها، object count، نام/path، چند checksum و دریافت واقعی رسیدها را تطبیق دهید.

قبل از snapshot نهایی، نوشتن مبدأ را وارد maintenance کنید: رزرو/پرداخت/پروفایل/آپلود، workerهای Vercel و pg_cron مبدأ و webhookهای بانکی در جریان باید تعیین تکلیف شوند. **تغییر DNS به‌تنهایی نوشتن روی سایت قدیمی را قطع نمی‌کند.** اگر انتقال آزمایشی انجام می‌دهید، برای snapshot نهایی از مقصد تازه/برنامه restore مشخص استفاده کنید؛ dump قدیمی روی رزروهای جدید overwrite نشود. تا تأیید انتقال نهایی، سرویس‌های قبلی را حذف نکنید.

## ۱۰. اتصال دامنه و SSL

DNS در پنلی تنظیم می‌شود که NSهای دامنه به آن اشاره می‌کنند؛ خرید دامنه یعنی DNS خودکار به سرور وصل نشده. روی PowerShell:

```powershell
Resolve-DnsName match-sho.com -Type NS
```

اگر می‌خواهید DNS آروان باشد: دامنه را در DNS/CDN آروان اضافه کنید، **همان NSهای دقیق پنل** را در پنل فروشنده دامنه قرار دهید و رکوردهای قبلی مخصوصاً MX/TXT/SPF/DKIM را حفظ کنید. نام NS حدسی وارد نکنید. عوض‌کردن DNS provider الزامی نیست؛ در پنل فعلی هم می‌شود A رکورد تنظیم کرد.

بعد از آماده‌شدن داده و قبل از انتشار نهایی:

| نوع | نام | مقدار | TTL |
|---|---|---|---|
| A | `@` | `85.198.55.121` | 300 |
| A | `api` | `85.198.55.121` | 300 |
| CNAME | `www` | `match-sho.com` | 300 |

برای تست مرحله انتقال می‌توانید فقط `api` را زودتر ببرید؛ apex تا cutover روی Vercel بماند. A/CNAME متعارض Vercel برای همان host را جایگزین کنید؛ سایر TXT/MX را دست نزنید. اگر IPv6 ندارید، AAAA قدیمی این hostها را حذف کنید. اگر CAA محدودکننده هست، مجوز CA مورد استفاده Caddy را بررسی کنید. ابتدا DNS-only، **بدون proxy/CDN آروان**. بعداً CDN با TLS origin معتبر و عدم cache حساب/ادمین/API.

Caddy HTTPS و تمدید خودکار را انجام می‌دهد؛ nginx/certbot هم‌زمان روی 80/443 نصب نکنید. خروجی اینترنت به ACME و دسترسی عمومی 80/443 لازم است. برای SSL دستورات `curl -k`، خاموش‌کردن TLS یا ارسال OTP بدون verify راه‌حل نیستند. www در Caddy به دامنه اصلی redirect می‌شود.

## ۱۱. اولین activate و تست نهایی

پس از restore/baseline/Storage، تنظیم SMTP/پیامک لازم، تحویل ایمیج و DNS، از حساب مدیریتی وارد کاربر برنامه شوید:

```bash
sudo -iu matchsho
cd /opt/matchsho/current
bash deploy/activate.sh
```

فقط اگر واقعاً انتقال انجام شده، در پرسش `MIGRATED` تایپ کنید. اسکریپت migrationهای جدید و jobهای مقصد را تنظیم و کانتینرها را اجرا می‌کند. کلید production-ready برای جلوگیری از انتشار زودهنگام ساخته می‌شود. marker را دستی برای ردکردن restore نسازید.

سپس:

```bash
bash deploy/check-ready.sh
curl -fsS https://match-sho.com/api/health
curl -I https://www.match-sho.com
curl -I https://api.match-sho.com/auth/v1/health
bash deploy/stack.sh logs --tail=50 caddy web auth functions scheduler
```

health سایت صرفاً liveness است. API health ممکن است بسته به gateway نیازمند apikey باشد؛ 401 بدون کلید به‌تنهایی خرابی Auth نیست. توکن worker/private key را برای تست در ترمینال عمومی چاپ نکنید.

با کاربر قدیمی و مدیر تست کنید: ورود/OTP واقعی، بازیابی ایمیل، پروفایل، تقویم، رزرو، پرداخت تست، آپلود رسید، مشاهده مدیر، رد با علت/ارسال مجدد، تأیید واریز، نهایی‌سازی رزرو، cron و اعلان. تعداد کاربران/رزرو/پرداخت و فایل‌ها با snapshot نهایی تطبیق داشته باشد. کاربر دیگر نباید رسید خصوصی را ببیند. در صورت روشن‌بودن Firebase پوش واقعی از IP جدید بررسی شود. تا موفقیت این‌ها maintenance را برندارید.

سپس بکاپ و کپی رمزگذاری‌شده خارج سرور بگیرید و در GitHub variable **`AUTO_DEPLOY=true`** کنید. از این لحظه push main پس از تست/build به‌طور خودکار منتشر می‌شود. برای اولین مهاجرت هیچ push خودکار سایت خالی را روشن نمی‌کرد.

## ۱۲. انتشارهای بعد، failure و نگهداری

در کامپیوتر روال عادی commit/PR/merge به main است. Actions تست‌ها، build و smoke test را اجرا می‌کند. نسخه با SHA دقیق شناخته می‌شود؛ source و image checksum دارند، انتقال host-key-verified است، env ثابت می‌ماند و deployها قفل می‌شوند. اگر main حین build جلو رفته باشد، نسخه قدیمی تحویل نمی‌شود؛ workflow نسخه جدید باید منتشر کند. سرور قبل migration بکاپ می‌گیرد و migration runner checksum/transaction دارد. فقط web، scheduler، router تقویم و Caddy recreate می‌شوند؛ DB و زیرساخت خودسرانه upgrade نمی‌شوند. بازگرداندن کد با commit تازه و schema سازگار انجام شود، نه بازپخش workflow قدیمی.

مهم:

- این استقرار **zero-downtime/blue-green نیست**؛ هنگام recreate ممکن است وقفه کوتاه باشد. healthcheck برابر بررسی عملکرد پرداخت/دیتابیس نیست.
- migrationهای خودکار باید **افزایشی و backward-compatible با نسخه قبلی** باشند. DROP/تغییر destructive، تغییر نسخه Supabase، کلید رمزنگاری، base compose و major DB نیازمند توقف AUTO_DEPLOY، برنامه maintenance/backup/restore و انتشار دستی است. تغییر compose/stack/setup/configure/Caddyfile در مسیر خودکار هم صراحتاً مسدود می‌شود و بررسی دستی می‌خواهد. فقط تغییر نسخه را با latest جایگزین نکنید. runner برای SQL rollback پس از موفقیت migration ضمانت بازگشت اپ ندارد.
- اگر تست/build/SSH قبل cutover خطا بدهد، نسخه قبلی باقی می‌ماند. اگر بالا آمدن کانتینر جدید خطا بدهد، تلاش به بازگرداندن کانتینرهای قبلی می‌شود، **نه rollback دیتابیس**. rollback ممکن است با schema ناسازگار شکست بخورد؛ لاگ را بررسی و بدون برنامه DB قدیمی restore نکنید.
- اسکریپت release موجود را overwrite نمی‌کند. اگر همان SHA به‌علت خطا نیمه‌کاره ماند، با commit اصلاحی جدید منتشر کنید یا پوشه دقیق release شکست‌خورده را پس از بررسی و حفظ shared به backup منتقل کنید؛ حذف کلی releases/runtime نکنید. بازپخش نسخه active کاری انجام نمی‌دهد. برای تغییر runtime env سرویس مربوط را recreate کنید.
- قبل از حذف نسخه قدیمی، image قدیمی و بکاپ معتبر نگه دارید. `docker system prune -a --volumes` و حذف shared ممنوع. بسته‌های incoming/backup خودکار پاک نمی‌شوند؛ مصرف دیسک را کنترل و فقط فایل‌های دقیقِ بررسی‌شده قدیمی را با سیاست retention و بکاپ خارج سرور پاک کنید. برای DB/Storage هیچ prune عمومی نزنید.
- بکاپ قبل deploy فایل‌ها را در حالت آنلاین می‌گیرد و snapshot یکپارچه SQL+Storage نیست. برای بازیابی معتبر، بکاپ دوره‌ای **با توقف نوشتن**، رمزگذاری، ذخیره خارج سرور و تمرین restore لازم است. پوشه backup روی همان دیسک جای نسخه مستقل نیست.
- پس از ورود داده جدید روی مقصد، برگرداندن ساده DNS به دیتابیس قدیمی باعث دوشاخه‌شدن داده‌ها می‌شود. بازیابی با reconciliation برنامه‌ریزی‌شده، نه فقط DNS rollback.

دستورهای روزمره، کاربر matchsho:

```bash
cd /opt/matchsho/current
bash deploy/stack.sh ps
bash deploy/stack.sh logs --tail=80 web scheduler functions
docker stats --no-stream
df -h / /var/lib/docker
bash deploy/backup.sh
```

لاگ‌ها را قبل از اشتراک‌گذاری از داده شخصی/کلید پاک کنید. `docker inspect` و `compose config` کامل ممکن است secret نشان دهند. برای env خصوصی جدید، مثلاً:

```bash
bash deploy/stack.sh up -d --no-build --pull never --no-deps --force-recreate web auth scheduler
```

این کار بعد از ورود کاربر به production هم باید در بازه امن انجام شود؛ auth/web توقف کوتاه دارند. برای دسترسی Studio، از SSH tunnel با **کلید مدیریتی شخصی** به `127.0.0.1:8000` و رمز Studio داخل env استفاده کنید؛ کلید CI forwarding ندارد و Studio را public نکنید.

### خطاهای متداول

| خطا | اقدام امن |
|---|---|
| Timeout apt | mirror و suite/امضا را بررسی؛ bootstrap با Arvan apt. خطای امضا را دور نزنید. |
| Docker.com یا رجیستری قطع | نصب بسته Ubuntu؛ prepare با include_infrastructure=true. روزمره ایمیج‌ها با SSH می‌رسند. |
| SSH timeout از Actions | فایروال شرکت/پورت/NAT/دسترسی بین‌الملل؛ GitHub runner باید به سرور برسد. |
| Host key verification failed | fingerprint را از کنسول معتبر دوباره بررسی؛ key قبلی را کورکورانه حذف نکنید. |
| Permission denied publickey | کاربر matchsho، authorized_keys و مالکیت 700/600، کلید خصوصی درست؛ key بدون passphrase مخصوص CI. |
| SMTP/Firebase/باشگاه قطع | شبکه خروجی واقعی از IP سرور تست؛ mirror Docker مشکل سرویس بیرونی را حل نمی‌کند. |
| baseline mismatch | checkout و history Cloud هم‌نسخه نیستند؛ توقف و مقایسه، نه history جعلی. |
| OOM یا دیسک پر | docker stats، free، df و log؛ ظرفیت را افزایش دهید، داده/volume را prune نکنید. |
| TLS صادر نمی‌شود | A/AAAA/CAA، proxy خاموش، پورت‌های80/443 و دسترسی ACME؛ لاگ Caddy، بدون -k. |

## منابع رسمی و حدود اعتبارسنجی

- [Supabase Docker: حداقل منابع و تنظیمات](https://supabase.com/docs/guides/self-hosting/docker)
- [نصب رسمی Docker روی Ubuntu و محدودیت UFW](https://docs.docker.com/engine/install/ubuntu/)
- [میرور رسمی ایمیج Docker آروان](https://www.arvancloud.ir/fa/dev/docker)؛ فقط URL mirror را استفاده می‌کنیم، تنظیم insecure آن نمونه را اعمال نمی‌کنیم.
- [میرور لینوکس آروان](https://www.arvancloud.ir/fa/dev/linux-repository)
- [امنیت GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)، [محدودیت پلن‌های environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [HTTPS خودکار Caddy و پیش‌نیاز DNS](https://caddyserver.com/docs/automatic-https)

تست‌های محلی برنامه و قواعد deployment، syntax شل و YAML جدا از تست live هستند. تا زمانی که SSH/Secrets و مهاجرت واقعی انجام نشوند، اجرای workflow روی GitHub، bundle کامل زیرساخت، عملکرد واقعی میرور از سرور ایران، SSL، ارسال پیامک/پوش و restore نهایی **تأییدشده محسوب نمی‌شوند**. اجرای راهنما روی سرور شما لازم است.
