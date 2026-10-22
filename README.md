# پدل کلاب — پلتفرم فارسی رزرو و هم‌بازی

توسعه افزایشی MVP موجود با Next.js App Router، React، TypeScript، Supabase PostgreSQL/Auth/Storage، Tailwind و Radix. صفحه عمومی، رزرو خصوصی، بازی چهار نفره، امریکانو، حساب کاربری، مدیریت عملیات و اتصال server-side زرین‌پال اضافه شده‌اند. داده‌های تاریخی و موتور رتبه‌بندی قبلی حفظ می‌شوند. داده نمایشی و تأیید ساختگی وارد محصول نمی‌شود.

## اجرای پروژه

Node.js حداقل 20.9 و npm لازم است:

```bash
cd padel-club
npm ci
cp .env.example .env.local
npm run dev
```

پس از تنظیم env و اعمال migration روی محیط مناسب، آدرس توسعه [localhost:3000](http://localhost:3000) است.

```bash
npm run build
npm start
```

بدون Supabase، صفحات عمومی وضعیت راه‌اندازی/نبود اطلاعات واقعی نشان می‌دهند. فونت فارسی محلی است. پس از تغییر env سرور را restart و نسخه production را rebuild کنید.

## متغیرهای محیطی

| متغیر                                | کاربرد                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL             | آدرس پروژه Supabase موجود                                       |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | کلید عمومی publishable یا anon                                  |
| NEXT_PUBLIC_SITE_URL                 | دامنه قطعی HTTPS؛ توسعه http://localhost:3000                   |
| SUPABASE_SECRET_KEY                  | فقط سرور؛ secret key یا service_role پروژه برای verify و worker |
| ZARINPAL_MERCHANT_ID                 | UUID پذیرنده زرین‌پال؛ فعلاً خالی                               |
| ZARINPAL_SANDBOX                     | true فقط آزمایشی؛ production برابر false                        |
| CRON_SECRET                          | secret قوی scheduler برای /api/jobs                             |
| BOOKING_PROVIDERS_JSON               | اتصال middleware مجاز باشگاه؛ پیش‌فرض {}                        |

فقط سه متغیر اول عمومی‌اند. هرگز secret/service_role یا token باشگاه را در NEXT_PUBLIC_ یا Git نگذارید. بدون تنظیمات درگاه پرداخت غیرفعال است؛ ورود، پروفایل و درخواست دستی مستقل قابل بررسی‌اند.

## SQL موردنیاز Supabase

مرجع تغییرات فایل‌های version-controlled در `supabase/migrations/` هستند:

1. `20260921094951_initial_padel_club_schema.sql` — مدل اولیه.
2. `20260923154020_round_winners_and_match_deletion.sql` — برد راند و حذف بازی.
3. `20260923221728_delete_tournament.sql` — حذف تورنمنت.
4. `20261022111028_platform_expansion.sql` — شهر، باشگاه، سانس، تجهیزات، پروفایل، رزرو، پرداخت و RLS.
5. `20261022111116_booking_transactions.sql` — تراکنش رزرو، ظرفیت، پرداخت و استرداد.
6. `20261022111120_events_results_and_jobs.sql` — رویداد، نتایج، job و Storage.

در دیتابیس **آزمایشی خالی** تمام فایل‌ها به ترتیب اجرا می‌شوند:

```bash
supabase start
supabase migration up
```

روی پروژه موجود **SQL قدیمی را دوباره اجرا نکنید و reset نزنید**. migrationهای توسعه و فعال‌سازی cron با تأیید کاربر روی production اعمال شده‌اند؛ نام فایل‌ها با تاریخچه واقعی هم‌تراز است. پیش از تغییر بعدی پشتیبان بگیرید. تغییر schema بعدی با `supabase migration new descriptive_name` ساخته شود؛ فایل اجراشده را تغییر ندهید. [گزارش انتشار](docs/DEPLOYMENT-20261022.md) وضعیت جدید را ثبت می‌کند.

## نحوه ساخت Admin

در Supabase → Authentication → Users حسابی با ایمیل واقعی و رمز قوی بسازید یا ثبت‌نام کاربر را تأیید کنید. سپس با SQL Editor مالک دیتابیس:

```sql
insert into public.admins(user_id)
select id from auth.users
where lower(email)=lower('admin@example.com')
on conflict(user_id) do nothing;

select u.email, a.created_at
from public.admins a join auth.users u on u.id=a.user_id;
```

با همان ایمیل در `/login` وارد شوید؛ مقصد ادمین `/admin` و کاربر عادی `/account` است. داشتن Auth یا user_metadata مجوز مدیریت نیست. حذف دسترسی:

```sql
delete from public.admins
where user_id=(select id from auth.users where lower(email)=lower('admin@example.com'));
```

ثبت‌نام عمومی، SMTP، تأیید ایمیل، Site URL و callbackها را طبق راهنمای عملیات تنظیم کنید. حساب پیش‌فرض وجود ندارد. اتصال بازیکن تاریخی به حساب جدید فقط پس از احراز هویت و انتخاب صریح مدیر انجام می‌شود.

## ساختار و مسیرها

| مسیر                                     | کاربرد                                        |
| ---------------------------------------- | --------------------------------------------- |
| /                                        | صفحه اصلی SSR و معرفی تعاملی                  |
| /clubs و /clubs/[slug]                   | باشگاه‌های منتشرشده                           |
| /cities/[city]/padel                     | باشگاه‌های واقعی شهر                          |
| /clubs/[slug]/book                       | انتخاب سانس و تجهیزات، رزرو/ساخت بازی         |
| /matches و /matches/[id]                 | فیلتر سطح/شهر/تاریخ و پیوستن                  |
| /events و /events/[slug]                 | ثبت‌نام و نتایج رویداد                        |
| /events/[slug]/rounds                    | دورهای امریکانو و ثبت توسط برگزارکننده        |
| /account/*                               | پروفایل، رزرو، پرداخت، رویداد، نتیجه و اعلان  |
| /admin/clubs                             | شهر، باشگاه، زمین، تجهیزات و تقویم            |
| /admin/operations                        | نگه‌داشت، پرداخت/استرداد، اعتراض، سطح و audit |
| /admin/events                            | ایجاد، تأیید دو زمین، شروع/پایان و نتیجه پایه |
| /players و /tournaments/*                | مدیریت قبلی                                   |
| /leaderboard و /tournaments/[id]/results | رتبه‌بندی تاریخی عمومی                        |
| /help و /terms و /privacy                | راهنما و شرایط فارسی                          |

Server Components داده را می‌خوانند؛ فرم‌های کوچک Client Component با ActionForm مشترک از Server Actions استفاده می‌کنند. قواعد حساس در RPCهای PostgreSQL با RLS و بررسی نقش اجرا می‌شوند. `src/lib/platform` مدل/داده، `src/lib/booking` قرارداد ارائه‌دهنده و worker، `src/lib/payments` درگاه و `src/components/platform` اجزای محصول هستند.

## قواعد مالی و امتیازدهی

- همه مبالغ integer ریال؛ نمایش تومان. زمان نمایش جلالی/تهران؛ ورودی date مرورگر میلادی و برچسب‌دار است.
- رزرو دستی تا مرجع واقعی و مهلت نگه‌داشت باشگاه پرداخت ندارد. مهلت حداکثر یک ساعت و محدود به hold/شروع/cutoff است.
- در بازی باز، زمین و تجهیزات مشترک چهار قسمت، تجهیزات شخصی و کارمزد مستقل‌اند. باقیمانده integer به یک سهم اضافه و مجموع دقیقاً برابر قیمت مرجع می‌شود.
- جایگاه تازه حداکثر ۱۰ دقیقه و محدود به hold است. چهار پرداخت باید تا چهار ساعت قبل شروع کامل شوند؛ وگرنه لغو و درخواست استرداد کامل ثبت می‌شود.
- تأیید دستی فقط پس از پرداخت‌های معتبر و hold معتبر؛ خودکار فقط پس از مرجع authoritative باشگاه. callback یا timeout موفقیت محسوب نمی‌شود.
- verify با مبلغ دیتابیس و مرجع یکتا؛ پرداخت دیرهنگام، جایگاه آزادشده را اشغال نمی‌کند و وارد پیگیری استرداد می‌شود.
- امریکانو همان هشت نفر، دو زمین، هفت دور، ۱۴ بازی و سه راند هر بازی است. برد دو راند، برد بازی است. رتبه: برد بازی، برد راند، تفاضل راند و اسلات اولیه. leaderboard فقط تورنمنت پایان‌یافته را جمع می‌کند.
- نتیجه دوستانه ریتینگ را تغییر نمی‌دهد. تغییر رقابتی نیازمند چهار شرکت‌کننده معتبر، تأیید هر دو تیم، سطح تأییدشده و تصمیم قابل audit مدیر است. ریتینگ با قبل/بعد ذخیره و بردهای تاریخی بازنویسی نمی‌شوند.
- تورنمنت عمومی ثبت‌نام، ظرفیت و رتبه/امتیاز نهایی پایه دارد؛ bracket پیشرفته اضافه نشده است.

## تست

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

با Chrome نصب‌شده: `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`.

تست SQL تمام migrationهای واقعی را روی PostgreSQL داخل PGlite اجرا می‌کند: حفظ تاریخچه، RLS، قیمت/موجودی، ظرفیت، مهلت، verify تکراری، استرداد و رویداد. تست مرورگر روی build production دسکتاپ/موبایل با `tests/browser/postgres-backend.mjs` است؛ Auth مرزی آزمون، اما داده و عملیات SQL/RLS واقعی‌اند. fixture هرگز وارد محصول نمی‌شود.

PGlite جای Supabase staging، Storage، SMTP، شبکه پرداخت و race چند اتصال را نمی‌گیرد. اطلاعات پذیرنده و API باشگاه بعداً تنظیم می‌شوند؛ پرداخت/رزرو خارجی واقعی هنوز آزمون پذیرش نشده‌اند.

## انتشار و حدود عملیاتی

[ممیزی و معماری](docs/EXPANSION.md) و [بکاپ، migration، زرین‌پال، cron، API و rollback](docs/OPERATIONS.md) بخشی از تحویل‌اند. scheduler باید عملاً فعال و بررسی شود. استرداد بانکی فعلاً پس از واریز واقعی توسط مدیر ثبت می‌شود؛ اعلان‌ها داخل حساب‌اند و ارسال ایمیل/SMS اضافه نشده است.

صفحات عمومی HTML قابل خزیدن، metadata/canonical، JSON-LD واقعی، sitemap و robots دارند. حساب/پرداخت/مدیریت و بازی‌های کوتاه‌عمر noindex هستند. فونت محلی، SVG سبک، تصاویر بهینه و reduced-motion استفاده شده‌اند. اهداف LCP≤2.5s، INP≤200ms و CLS≤0.1 باید در production با داده واقعی اندازه‌گیری شوند.

منابع: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)، [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)، [زرین‌پال](https://www.zarinpal.com/docs/paymentGateway/connectToGateway).

## نتیجه بررسی محلی این تحویل

۲۵ تست منطق/SQL/قرارداد درگاه و ارائه‌دهنده، و ۲۲ تست مرورگر دسکتاپ/موبایل موفق شدند. ESLint، TypeScript strict و build production موفق‌اند. [گزارش فازها و محدودیت پذیرش](docs/QA.md) همراه تغییرات است؛ این نتیجه به معنی اجرای پرداخت یا migration در production نیست.
