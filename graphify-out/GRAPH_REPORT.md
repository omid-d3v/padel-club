# Graph Report - padel-club  (2026-10-23)

## Corpus Check
- 209 files · ~225,939 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1086 nodes · 2732 edges · 73 communities (43 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b4c5f49`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- shared.tsx
- dependencies
- بازطراحی کنترل‌ها، حساب و پنل
- 20261022111120_events_results_and_jobs.sql
- calendar-sources.ts
- Next.js App Router Architecture
- compilerOptions
- package.json
- platform.test.ts
- components.json
- payment-actions.ts
- رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی
- next-env.d.ts
- postcss.config.mjs
- providers.ts
- postgres-backend.mjs
- ref_next_types_root_params_d_ts
- ref_next_types_routes_d_ts
- devDependencies
- 20261022111028_platform_expansion.sql
- platform-actions.ts
- This is NOT the Next.js you know
- private.calendar_slot_fresh
- booking-form.tsx
- 20261022131605_calendar_connections.sql
- گزارش تحویل مرحله‌ای
- scripts
- 20261022143309_booking_benefits.sql
- platform/types.ts
- eslint.config.mjs
- push-opt-in.tsx
- 20261022132244_calendar_scheduler.sql
- Club calendar integration — 2026-10-22
- 20261022132206_calendar_recoverable_mappings.sql
- BOOKING-CALENDAR-UX.md
- تخفیف و معرفی باشگاه
- MatchSho | مچ شو
- engines
- date-time.ts
- next
- public.match_sets
- public.courts
- formatPersianMoment
- README.md
- public.calendar_connections
- operations/page.tsx
- پیگیری رزرو، ورود پیامکی و اعلان‌ها
- react
- قواعد مشترک محصول و پنل
- راهنمای انتشار و عملیات
- integrations/page.tsx
- profile/page.tsx
- توسعه پدل کلاب — ممیزی و طرح انتشار
- next_types_root_params_d
- overrides
- 20261023165928_transfer_payments_and_settings.sql
- next_types_routes_d
- رزرو مرحله‌ای و کارت‌به‌کارت

## God Nodes (most connected - your core abstractions)
1. `next` - 66 edges
2. `formatPersianMoment()` - 41 edges
3. `requireMember()` - 41 edges
4. `moment` - 38 edges
5. `number()` - 37 edges
6. `react` - 36 edges
7. `money()` - 34 edges
8. `lucide-react` - 33 edges
9. `requireAdmin` - 32 edges
10. `ActionForm()` - 27 edges

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

## Communities (73 total, 30 thin omitted)

### Community 0 - "shared.tsx"
Cohesion: 0.07
Nodes (80): lucide-react, sonner, changeStatus(), createTournament(), deleteMatch(), deletePlayer(), deleteTournament(), fail() (+72 more)

### Community 1 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority, clsx, firebase, @fontsource/vazirmatn, lucide-react, next, @radix-ui/react-dialog (+9 more)

### Community 2 - "بازطراحی کنترل‌ها، حساب و پنل"
Cohesion: 0.50
Nodes (3): بازطراحی کنترل‌ها، حساب و پنل, بررسی, تغییرات

### Community 3 - "20261022111120_events_results_and_jobs.sql"
Cohesion: 0.07
Nodes (24): pg_namespace, pg_proc, public.event_registrations, public.open_matches, public.platform_events, public.provider_attempts, public.user_profiles, audit_event_placement (+16 more)

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

### Community 8 - "platform.test.ts"
Cohesion: 0.08
Nodes (20): ref_node_fs, @playwright/test, contentType, size, alt, contentType, size, SocialImage() (+12 more)

### Community 9 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "payment-actions.ts"
Cohesion: 0.07
Nodes (44): ref_node_crypto, ref_node_url, ref_server_only, standardwebhooks, vitest, POST(), dynamic, GET() (+36 more)

### Community 12 - "رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی"
Cohesion: 0.14
Nodes (14): SQL موردنیاز Supabase, اجرای پروژه, انتشار و حدود عملیاتی, تخفیف، رزرو رایگان و معرفی باشگاه, تست, تقویم شمسی و زمان تهران, رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی, ساختار و مسیرها (+6 more)

### Community 13 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): next_e2e_types_root_params_d, next_e2e_types_routes_d, NOTE: This file should not be edited

### Community 15 - "providers.ts"
Cohesion: 0.09
Nodes (11): AuthorizedBridge, BookingProvider, bookingSchema, configSchema, iso, ProviderBooking, ProviderCapabilities, ProviderSlot (+3 more)

### Community 16 - "postgres-backend.mjs"
Cohesion: 0.07
Nodes (32): ref_node_http, base64(), matches, names, participants, players, results, rounds (+24 more)

### Community 19 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, prettier, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "20261022111028_platform_expansion.sql"
Cohesion: 0.18
Nodes (8): private.check_slot, public.availability_rules, no_overlapping_slots, public.discover_slots(), public.generate_court_slots(), public.bookings, public.court_slots, public.courts

### Community 21 - "platform-actions.ts"
Cohesion: 0.09
Nodes (36): @electric-sql/pglite, zod, errorResult(), errors, int(), iso(), optionalId(), platformAction() (+28 more)

### Community 23 - "private.calendar_slot_fresh"
Cohesion: 0.20
Nodes (10): private.check_calendar_booking, private.calendar_slot_fresh(), public.discover_slots(), require_fresh_calendar, public.bookings, public.calendar_connections, public.calendar_court_mappings, public.clubs (+2 more)

### Community 24 - "booking-form.tsx"
Cohesion: 0.18
Nodes (12): BookingAccess(), JoinForm(), PaymentChooser(), PaymentMethodFields(), PaymentMethods, EquipmentIcon(), SportIcon(), SPORTS (+4 more)

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

### Community 30 - "platform/types.ts"
Cohesion: 0.11
Nodes (22): Audit, AvailabilityRule, Booking, BookingItem, CalendarConnection, City, Club, MatchPreview (+14 more)

### Community 33 - "push-opt-in.tsx"
Cohesion: 0.10
Nodes (19): firebase, logout(), AdminLayout(), dynamic, metadata, AccountLayout(), dynamic, metadata (+11 more)

### Community 34 - "20261022132244_calendar_scheduler.sql"
Cohesion: 0.33
Nodes (4): pg_available_extensions, private.dispatch_calendar_sync(), public.calendar_scheduler_status(), public.calendar_connections

### Community 38 - "Club calendar integration — 2026-10-22"
Cohesion: 0.33
Nodes (5): Club calendar integration — 2026-10-22, Integrity and failure behavior, Supabase advisory review, Validation, Verified production setup

### Community 39 - "20261022132206_calendar_recoverable_mappings.sql"
Cohesion: 0.67
Nodes (3): calendar_active_court, calendar_active_external, public.calendar_court_mappings

### Community 43 - "MatchSho | مچ شو"
Cohesion: 0.13
Nodes (14): MatchSho | مچ شو, اجزا و حالات, اعتماد، دسترس‌پذیری و SEO, تایپوگرافی و شبکه, تب‌های تغییر مسیر رزرو, جایگاه و وعده, حرکت, دارایی‌های اصلی (+6 more)

### Community 48 - "date-time.ts"
Cohesion: 0.10
Nodes (36): Matches(), metadata, AvailabilityPicker(), AvailableSlot, BookingMode, BookingModeTabs(), modes, BOOKING_STEPS (+28 more)

### Community 49 - "next"
Cohesion: 0.06
Nodes (54): config, next, @supabase/ssr, GET(), Global Stylesheet, metadata, AccountEvents(), requestPasswordReset() (+46 more)

### Community 54 - "formatPersianMoment"
Cohesion: 0.22
Nodes (24): ManageClubs(), ManageEvents(), GET(), Bookings(), Notifications(), Account(), TransferPayment(), Payments() (+16 more)

### Community 56 - "README.md"
Cohesion: 0.20
Nodes (5): انتشار ۳۰ مهر ۱۴۰۵, Persian calendar and Tehran time, بررسی این نسخه, مچ شو: اصلاح رابط رزرو و مدیریت واریز, رالی‌یار؛ اصلاح فرم و یکپارچگی برند

### Community 59 - "operations/page.tsx"
Cohesion: 0.20
Nodes (9): Operations(), sections, AdminListItem, BookingFulfillment(), fulfillmentLabels, ReceiptReview(), adminRows(), Tables (+1 more)

### Community 60 - "پیگیری رزرو، ورود پیامکی و اعلان‌ها"
Cohesion: 0.14
Nodes (14): Firebase Cloud Messaging, Online Payamak و OTP, آزمون مسیر رزرو در مرورگر, بازی باز، سفارش قدیمی و اتصال رزرو خودکار, جریان مدیر و کاربر, رزرو خصوصی جدید: پرداخت، سپس تأیید نهایی, زمان‌بندی و تحویل اعلان, فایل‌ها و نقاط ورود (+6 more)

### Community 61 - "react"
Cohesion: 0.15
Nodes (19): پنل: AdminList و DetailPanel, react, metadata, metadata, registerAccount(), metadata, replacementCalendar(), dynamic (+11 more)

### Community 62 - "قواعد مشترک محصول و پنل"
Cohesion: 0.24
Nodes (6): انتخاب تعداد: QuantityStepper, حساب، آیکون و حرکت, قواعد مشترک محصول و پنل, links, MemberNav(), RallyLoader()

### Community 63 - "راهنمای انتشار و عملیات"
Cohesion: 0.25
Nodes (7): اجرای jobها, احراز هویت و تصاویر, راهنمای انتشار و عملیات, فعال‌سازی زرین‌پال, قرارداد اتصال مجاز باشگاه, پیش از انتشار, کنترل پس از انتشار و بازیابی

### Community 64 - "integrations/page.tsx"
Cohesion: 0.28
Nodes (7): discovered(), errors, Integrations(), metadata, sources, statuses, CalendarStatusRefresh()

### Community 65 - "profile/page.tsx"
Cohesion: 0.47
Nodes (3): AvatarUpload(), PlayerAvatar(), SKILLS

### Community 66 - "توسعه پدل کلاب — ممیزی و طرح انتشار"
Cohesion: 0.40
Nodes (4): برنامه مهاجرت و بازیابی, تصمیم‌های سازگاری, توسعه پدل کلاب — ممیزی و طرح انتشار, ممیزی، ۳۰ مهر ۱۴۰۵

### Community 73 - "رزرو مرحله‌ای و کارت‌به‌کارت"
Cohesion: 0.29
Nodes (7): اجرا و آزمون, ثبت و بررسی رسید, حریم خصوصی و مجوزها, رزرو مرحله‌ای و کارت‌به‌کارت, فعال‌سازی از پنل مدیر, مسیر کاربر, مهلت، لغو و جلوگیری از دوباره‌پرداخت

## Knowledge Gaps
- **263 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+258 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 458 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `shared.tsx`, `integrations/page.tsx`, `push-opt-in.tsx`, `profile/page.tsx`, `package.json`, `platform.test.ts`, `payment-actions.ts`, `date-time.ts`, `platform-actions.ts`, `formatPersianMoment`, `operations/page.tsx`, `react`, `قواعد مشترک محصول و پنل`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `vitest` connect `payment-actions.ts` to `calendar-sources.ts`, `package.json`, `platform.test.ts`, `date-time.ts`, `next`, `platform-actions.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `JalaliDateInput()` connect `date-time.ts` to `README.md`, `next`, `react`, `shared.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _263 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `shared.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07061266874350987 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `20261022111120_events_results_and_jobs.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.06685633001422475 - nodes in this community are weakly interconnected._