# Graph Report - padel-club  (2026-10-26)

## Corpus Check
- 264 files · ~257,005 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 6, .example 2, .css 1)

## Summary
- 1348 nodes · 3136 edges · 114 communities (57 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f967e5e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- next
- dependencies
- بازطراحی کنترل‌ها، حساب و پنل
- 20261022111120_events_results_and_jobs.sql
- calendar-sources.ts
- Next.js App Router Architecture
- compilerOptions
- package.json
- prepare-db-init.sh
- components.json
- platform/data.ts
- رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی
- next-env.d.ts
- postcss.config.mjs
- edge-main/index.ts
- postgres-backend.mjs
- ref_next_types_root_params_d_ts
- ref_next_types_routes_d_ts
- devDependencies
- 20261022111028_platform_expansion.sql
- booking-form.tsx
- This is NOT the Next.js you know
- private.calendar_slot_fresh
- MIGRATION-2026-10-25.md
- 20261022131605_calendar_connections.sql
- گزارش تحویل مرحله‌ای
- scripts
- 20261022143309_booking_benefits.sql
- backend.mjs
- push-opt-in.tsx
- MatchSho | مچ شو
- 20261022132244_calendar_scheduler.sql
- Club calendar integration — 2026-10-22
- 20261022132206_calendar_recoverable_mappings.sql
- BOOKING-CALENDAR-UX.md
- تخفیف و معرفی باشگاه
- از سرور خام ایران تا انتشار خودکار مچ شو
- engines
- date-time.ts
- online-payamak.ts
- public.match_sets
- public.courts
- platform/types.ts
- README.md
- public.calendar_connections
- تغییر IP سرور بدون نصب مجدد
- پیگیری رزرو، ورود پیامکی و اعلان‌ها
- متن‌های آمادهٔ ثبت
- استقرار مچ شو روی سرور شخصی و انتقال از Cloud
- راهنمای انتشار و عملیات
- platform-actions.ts
- platform.test.ts
- توسعه پدل کلاب — ممیزی و طرح انتشار
- activate.sh
- overrides
- 20261023165928_transfer_payments_and_settings.sql
- bootstrap-ubuntu.sh
- release.sh
- رزرو مرحله‌ای و کارت‌به‌کارت
- proxy.ts
- stack.sh
- backup.sh
- migrate.sh
- scheduler.mjs
- setup.sh
- next_e2e_types_root_params_d
- next_e2e_types_routes_d
- requireMember
- check-ready.sh
- public-env.sh
- vitest
- auth-methods.tsx
- 20261026171320_club_availability_controls.sql
- verify-ssh.sh
- AuthorizedBridge
- icon.tsx
- @playwright/test
- requireAdmin
- انتشار موقت بدون اتصال مستقیم GitHub و سرور
- smoke-image.sh
- رفع No such image بعد از بارگذاری بسته
- install-offline.sh
- cards.tsx
- recover-prepare.sh
- ورود موبایلی، تکمیل پروفایل و ناوبری شیشه‌ای
- opengraph-image.tsx
- storage-policy-restore.test.ts
- restore-storage-policies.sh script
- format.ts
- notifications/worker.ts
- club-availability.test.ts
- app/layout.tsx
- CLUB-AVAILABILITY.md
- ref_node_fs
- eslint.config.mjs

## God Nodes (most connected - your core abstractions)
1. `next` - 73 edges
2. `requireMember()` - 44 edges
3. `formatPersianMoment()` - 41 edges
4. `moment` - 38 edges
5. `number()` - 37 edges
6. `react` - 36 edges
7. `lucide-react` - 35 edges
8. `money()` - 34 edges
9. `requireAdmin` - 32 edges
10. `catalog` - 28 edges

## Surprising Connections (you probably didn't know these)
- `سلسله‌مراتب اکشن‌ها — قاعدهٔ الزامی` --references--> `ActionForm()`  [INFERRED]
  DESIGN.md → src/components/platform/action-form.tsx
- `Persian calendar and Tehran time` --references--> `JalaliDateInput()`  [INFERRED]
  docs/JALALI-CALENDAR.md → src/components/ui/jalali-date-input.tsx
- `پیش از انتشار` --references--> `matches()`  [INFERRED]
  docs/OPERATIONS.md → src/lib/platform/data.ts
- `تب‌های تغییر مسیر رزرو` --references--> `BookingModeTabs()`  [INFERRED]
  DESIGN.md → src/components/platform/booking-mode-tabs.tsx
- `قواعد مشترک محصول و پنل` --references--> `QuantityStepper()`  [INFERRED]
  DESIGN.md → src/components/ui/quantity-stepper.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Security and Integrity Model** — readme_supabase_backend, readme_admin_authorization, readme_row_level_security, readme_database_integrity_model, readme_optimistic_concurrency_control [EXTRACTED 1.00]
- **Tournament Scoring and Ranking Model** — readme_tournament_lifecycle, readme_score_entry_rules, readme_ranking_rules, readme_leaderboard_rules [EXTRACTED 1.00]

## Communities (114 total, 57 thin omitted)

### Community 0 - "next"
Cohesion: 0.06
Nodes (79): پنل: AdminList و DetailPanel, config, lucide-react, next, react, sonner, metadata, errors (+71 more)

### Community 1 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority, clsx, firebase, @fontsource/vazirmatn, lucide-react, next, @radix-ui/react-dialog (+9 more)

### Community 2 - "بازطراحی کنترل‌ها، حساب و پنل"
Cohesion: 0.50
Nodes (3): بازطراحی کنترل‌ها، حساب و پنل, بررسی, تغییرات

### Community 3 - "20261022111120_events_results_and_jobs.sql"
Cohesion: 0.07
Nodes (24): pg_namespace, pg_proc, public.open_matches, public.provider_attempts, audit_event_placement, audit_profile_change, private.can_read_tournament(), public.apply_external_quote() (+16 more)

### Community 4 - "calendar-sources.ts"
Cohesion: 0.23
Nodes (17): amount(), CalendarError, CalendarSlot, ExternalCourt, Fetcher, iranDate(), object(), openCalendar() (+9 more)

### Community 5 - "Next.js App Router Architecture"
Cohesion: 0.09
Nodes (22): Project Knowledge Graph, Graphify Codebase Workflow, Next.js Agent Rules, AGENTS.md Reference, Admin Authorization, Browser Test Strategy, Database-Centric Integrity Model, Database Test Strategy (+14 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 7 - "package.json"
Cohesion: 0.08
Nodes (23): author, description, keywords, license, name, private, type, version (+15 more)

### Community 9 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "platform/data.ts"
Cohesion: 0.19
Nodes (19): Club(), generateMetadata(), Events(), Event(), generateMetadata(), Home(), robots(), dynamic (+11 more)

### Community 12 - "رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی"
Cohesion: 0.14
Nodes (14): SQL موردنیاز Supabase, اجرای پروژه, انتشار و حدود عملیاتی, تخفیف، رزرو رایگان و معرفی باشگاه, تست, تقویم شمسی و زمان تهران, رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی, ساختار و مسیرها (+6 more)

### Community 13 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, next_types_root_params_d, next_types_routes_d

### Community 15 - "edge-main/index.ts"
Cohesion: 0.38
Nodes (3): create(), routeCalendar(), WorkerOptions

### Community 16 - "postgres-backend.mjs"
Cohesion: 0.08
Nodes (23): admin, base64(), checkoutDesktop, checkoutMobile, db, directory, mobilePlayer, names (+15 more)

### Community 19 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, prettier, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "20261022111028_platform_expansion.sql"
Cohesion: 0.18
Nodes (8): private.check_slot, public.availability_rules, no_overlapping_slots, public.discover_slots(), public.generate_court_slots(), public.bookings, public.court_slots, public.courts

### Community 21 - "booking-form.tsx"
Cohesion: 0.20
Nodes (13): ActionForm(), BookingAccess(), BookingForm(), BOOKING_STEPS, BookingProgress(), icons, PaymentChooser(), PaymentMethodFields() (+5 more)

### Community 23 - "private.calendar_slot_fresh"
Cohesion: 0.20
Nodes (10): private.check_calendar_booking, private.calendar_slot_fresh(), public.discover_slots(), require_fresh_calendar, public.bookings, public.calendar_connections, public.calendar_court_mappings, public.clubs (+2 more)

### Community 25 - "20261022131605_calendar_connections.sql"
Cohesion: 0.27
Nodes (10): calendar_due, calendar_runs_recent, imported_calendar_slots, public.calendar_connections, public.calendar_court_mappings, public.calendar_sync_runs, public, public.clubs (+2 more)

### Community 26 - "گزارش تحویل مرحله‌ای"
Cohesion: 0.50
Nodes (3): باقی‌مانده برای انتشار واقعی, دامنه تست, گزارش تحویل مرحله‌ای

### Community 27 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, start, test, test:e2e (+1 more)

### Community 29 - "20261022143309_booking_benefits.sql"
Cohesion: 0.29
Nodes (6): auth.users, audit_platform_change, public.booking_benefits, public.discount_codes, private.audit_change, public.booking_participants

### Community 30 - "backend.mjs"
Cohesion: 0.16
Nodes (17): ref_node_http, base64(), matches, names, participants, players, results, rounds (+9 more)

### Community 32 - "push-opt-in.tsx"
Cohesion: 0.10
Nodes (19): firebase, logout(), AdminLayout(), dynamic, metadata, AccountLayout(), dynamic, metadata (+11 more)

### Community 33 - "MatchSho | مچ شو"
Cohesion: 0.09
Nodes (19): MatchSho | مچ شو, اجزا و حالات, اعتماد، دسترس‌پذیری و SEO, انتخاب تعداد: QuantityStepper, تایپوگرافی و شبکه, تب‌های تغییر مسیر رزرو, جایگاه و وعده, حرکت (+11 more)

### Community 34 - "20261022132244_calendar_scheduler.sql"
Cohesion: 0.33
Nodes (4): pg_available_extensions, private.dispatch_calendar_sync(), public.calendar_scheduler_status(), public.calendar_connections

### Community 38 - "Club calendar integration — 2026-10-22"
Cohesion: 0.33
Nodes (5): Club calendar integration — 2026-10-22, Integrity and failure behavior, Supabase advisory review, Validation, Verified production setup

### Community 39 - "20261022132206_calendar_recoverable_mappings.sql"
Cohesion: 0.67
Nodes (3): calendar_active_court, calendar_active_external, public.calendar_court_mappings

### Community 43 - "از سرور خام ایران تا انتشار خودکار مچ شو"
Cohesion: 0.12
Nodes (16): از سرور خام ایران تا انتشار خودکار مچ شو, خطاهای متداول, منابع رسمی و حدود اعتبارسنجی, نقشه راه و ظرفیت, ۱. اولین ورود و بررسی سرور, ۱۰. اتصال دامنه و SSL, ۱۱. اولین activate و تست نهایی, ۱۲. انتشارهای بعد، failure و نگهداری (+8 more)

### Community 48 - "date-time.ts"
Cohesion: 0.13
Nodes (31): AvailabilityPicker(), AvailableSlot, BookingMode, BookingModeTabs(), modes, DayStrip(), JalaliDateInput(), showCalendar() (+23 more)

### Community 49 - "online-payamak.ts"
Cohesion: 0.24
Nodes (9): standardwebhooks, POST(), sendSms(), smsConfig, SmsError, eventTemplates, smsTemplates, { rpc, getUserById, sendSms } (+1 more)

### Community 54 - "platform/types.ts"
Cohesion: 0.09
Nodes (26): fulfillmentLabels, Audit, AvailabilityRule, Booking, BookingItem, CalendarConnection, City, Club (+18 more)

### Community 56 - "README.md"
Cohesion: 0.18
Nodes (5): انتشار ۳۰ مهر ۱۴۰۵, Persian calendar and Tehran time, بررسی این نسخه, مچ شو: اصلاح رابط رزرو و مدیریت واریز, رالی‌یار؛ اصلاح فرم و یکپارچگی برند

### Community 59 - "تغییر IP سرور بدون نصب مجدد"
Cohesion: 0.33
Nodes (6): تغییر IP سرور بدون نصب مجدد, ۱. Variables گیت‌هاب, ۲. Secret کلید میزبان را برای IP جدید به‌روز کنید, ۳. اول تست اتصال بدون build یا تغییر سرور, ۴. ادامه نصب موجود, ۵. دامنه و سرویس‌های وابسته

### Community 60 - "پیگیری رزرو، ورود پیامکی و اعلان‌ها"
Cohesion: 0.13
Nodes (15): Firebase Cloud Messaging, Online Payamak و OTP, آزمون مسیر رزرو در مرورگر, بازی باز، سفارش قدیمی و اتصال رزرو خودکار, جریان مدیر و کاربر, رزرو خصوصی جدید: پرداخت، سپس تأیید نهایی, زمان‌بندی و تحویل اعلان, عیب‌یابی ورود پیامکی (+7 more)

### Community 61 - "متن‌های آمادهٔ ثبت"
Cohesion: 0.09
Nodes (22): adminbooking, bookingconfirmed, bookingexpired, bookingfulfilled, bookinghold, bookingpaid, bookingquote, bookingrequest (+14 more)

### Community 62 - "استقرار مچ شو روی سرور شخصی و انتقال از Cloud"
Cohesion: 0.13
Nodes (15): استقرار مچ شو روی سرور شخصی و انتقال از Cloud, مسیر A: نصب کاملاً خالی، بدون اطلاعات قبلی, مسیر B: انتقال سایت فعلی — مسیر مناسب شما, معماری و پیش‌نیازها, منابع رسمی, وضعیت بررسی, ۱. آماده‌سازی سرور، بدون تغییر سایت فعلی, ۲. ساخت ایمیج سایت (+7 more)

### Community 63 - "راهنمای انتشار و عملیات"
Cohesion: 0.25
Nodes (7): اجرای jobها, احراز هویت و تصاویر, راهنمای انتشار و عملیات, فعال‌سازی زرین‌پال, قرارداد اتصال مجاز باشگاه, پیش از انتشار, کنترل پس از انتشار و بازیابی

### Community 64 - "platform-actions.ts"
Cohesion: 0.06
Nodes (62): ref_server_only, zod, Settings(), dynamic, GET(), GET(), beginPayment(), retryVerifyPayment() (+54 more)

### Community 65 - "platform.test.ts"
Cohesion: 0.29
Nodes (12): approve(), db, finish(), participant(), paySeat(), query(), request(), role() (+4 more)

### Community 66 - "توسعه پدل کلاب — ممیزی و طرح انتشار"
Cohesion: 0.40
Nodes (4): برنامه مهاجرت و بازیابی, تصمیم‌های سازگاری, توسعه پدل کلاب — ممیزی و طرح انتشار, ممیزی، ۳۰ مهر ۱۴۰۵

### Community 73 - "رزرو مرحله‌ای و کارت‌به‌کارت"
Cohesion: 0.22
Nodes (9): اجرا و آزمون, اصلاح مهلت بررسی رسید و تشخیص خطای آپلود, بازیابی مجوزهای Storage پس از انتقال Cloud, ثبت و بررسی رسید, حریم خصوصی و مجوزها, رزرو مرحله‌ای و کارت‌به‌کارت, فعال‌سازی از پنل مدیر, مسیر کاربر (+1 more)

### Community 84 - "requireMember"
Cohesion: 0.19
Nodes (20): ManageClubs(), ManageEvents(), discovered(), Integrations(), Operations(), GET(), Bookings(), Notifications() (+12 more)

### Community 87 - "vitest"
Cohesion: 0.15
Nodes (13): generateConfig(), replaceEnv(), jobsPlan(), loadMigrations(), migrationPlan(), sqlQuote(), stripTransaction(), publicConfig() (+5 more)

### Community 88 - "auth-methods.tsx"
Cohesion: 0.08
Nodes (48): dynamic, Forgot(), metadata, dynamic, Login(), metadata, dynamic, metadata (+40 more)

### Community 89 - "20261026171320_club_availability_controls.sql"
Cohesion: 0.12
Nodes (23): private.guard_club_reservation, private.lock_club_publication, public.event_placements, active_club_booking, active_club_participation, active_club_payment, active_club_registration, active_club_replacement (+15 more)

### Community 94 - "requireAdmin"
Cohesion: 0.10
Nodes (37): changeStatus(), createTournament(), deleteMatch(), deletePlayer(), deleteTournament(), fail(), recalculateTournamentStandings(), refresh() (+29 more)

### Community 95 - "انتشار موقت بدون اتصال مستقیم GitHub و سرور"
Cohesion: 0.29
Nodes (7): انتشار موقت بدون اتصال مستقیم GitHub و سرور, وضعیت اعتبارسنجی, ۱. جلوگیری از تلاش SSH قدیمی, ۲. بسته اول: prepare با زیرساخت کامل, ۳. تنظیمات عمومی را از سرور به GitHub بدهید, ۴. بسته دوم: deploy با ایمیج واقعی سایت, ۵. آپدیت‌های بعدی

### Community 97 - "رفع No such image بعد از بارگذاری بسته"
Cohesion: 0.50
Nodes (3): بازیابی بسته قدیمی بدون دانلود مجدد, رفع No such image بعد از بارگذاری بسته, هم‌تراز کردن کد آماده با main اصلاح‌شده

### Community 99 - "cards.tsx"
Cohesion: 0.11
Nodes (20): City(), generateMetadata(), Clubs(), metadata, metadata, metadata, metadata, faqs (+12 more)

### Community 101 - "ورود موبایلی، تکمیل پروفایل و ناوبری شیشه‌ای"
Cohesion: 0.33
Nodes (5): انتشار و آزمون, روش‌های ورود و رمز, ظاهر و کارایی, مدیر اصلی موجود, ورود موبایلی، تکمیل پروفایل و ناوبری شیشه‌ای

### Community 102 - "opengraph-image.tsx"
Cohesion: 0.33
Nodes (4): alt, contentType, size, SocialImage()

### Community 103 - "storage-policy-restore.test.ts"
Cohesion: 0.33
Nodes (3): @electric-sql/pglite, db, repair

### Community 107 - "format.ts"
Cohesion: 0.27
Nodes (9): AccountEvents(), generateMetadata(), Match(), Matches(), InviteButton(), JoinForm(), matches(), bookingLabels (+1 more)

### Community 108 - "notifications/worker.ts"
Cohesion: 0.26
Nodes (10): ref_node_crypto, dynamic, GET(), maxDuration, accessToken(), pushConfigured(), sendPush(), notificationSmsTemplate (+2 more)

### Community 109 - "club-availability.test.ts"
Cohesion: 0.50
Nodes (6): db, fixture(), active(), request(), slot(), role()

### Community 112 - "ref_node_fs"
Cohesion: 0.36
Nodes (6): offlineImageTag(), portableImageMap(), imageMap(), ref_node_child_process, ref_node_fs, ref_node_os

## Knowledge Gaps
- **386 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 621 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `platform-actions.ts`, `push-opt-in.tsx`, `cards.tsx`, `opengraph-image.tsx`, `package.json`, `platform/data.ts`, `format.ts`, `notifications/worker.ts`, `proxy.ts`, `app/layout.tsx`, `date-time.ts`, `requireMember`, `booking-form.tsx`, `auth-methods.tsx`, `icon.tsx`, `requireAdmin`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `JalaliDateInput()` connect `date-time.ts` to `README.md`, `cards.tsx`, `platform-actions.ts`, `next`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `Persian calendar and Tehran time` connect `README.md` to `date-time.ts`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.06024246969128859 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `20261022111120_events_results_and_jobs.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.06685633001422475 - nodes in this community are weakly interconnected._