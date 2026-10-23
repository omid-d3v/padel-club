# Graph Report - padel-club  (2026-10-23)

## Corpus Check
- 195 files · ~204,778 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1027 nodes · 2564 edges · 63 communities (35 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `891f31f2`
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
- AuthorizedBridge
- postgres-backend.mjs
- ref_next_types_root_params_d_ts
- ref_next_types_routes_d_ts
- devDependencies
- 20261022111028_platform_expansion.sql
- next
- This is NOT the Next.js you know
- private.calendar_slot_fresh
- جریان مدیر و کاربر
- 20261022131605_calendar_connections.sql
- گزارش تحویل مرحله‌ای
- scripts
- 20261022143309_booking_benefits.sql
- platform/types.ts
- eslint.config.mjs
- actions.ts
- 20261022132244_calendar_scheduler.sql
- Club calendar integration — 2026-10-22
- 20261022132206_calendar_recoverable_mappings.sql
- BOOKING-CALENDAR-UX.md
- تخفیف و معرفی باشگاه
- RallyYar | رالی‌یار
- engines
- date-time.ts
- platform/data.ts
- public.match_sets
- public.courts
- README.md
- public.calendar_connections
- پیگیری رزرو، ورود پیامکی و اعلان‌ها
- راهنمای انتشار و عملیات
- توسعه پدل کلاب — ممیزی و طرح انتشار
- overrides

## God Nodes (most connected - your core abstractions)
1. `next` - 62 edges
2. `formatPersianMoment()` - 37 edges
3. `number()` - 37 edges
4. `react` - 35 edges
5. `requireMember()` - 35 edges
6. `moment` - 34 edges
7. `money()` - 32 edges
8. `lucide-react` - 31 edges
9. `requireAdmin` - 27 edges
10. `catalog` - 26 edges

## Surprising Connections (you probably didn't know these)
- `تب‌های تغییر مسیر رزرو` --references--> `BookingModeTabs()`  [INFERRED]
  DESIGN.md → src/components/platform/booking-mode-tabs.tsx
- `Persian calendar and Tehran time` --references--> `JalaliDateInput()`  [INFERRED]
  docs/JALALI-CALENDAR.md → src/components/ui/jalali-date-input.tsx
- `پیش از انتشار` --references--> `matches()`  [INFERRED]
  docs/OPERATIONS.md → src/lib/platform/data.ts
- `قواعد مشترک محصول و پنل` --references--> `QuantityStepper()`  [INFERRED]
  DESIGN.md → src/components/ui/quantity-stepper.tsx
- `پنل: AdminList و DetailPanel` --references--> `AdminList()`  [INFERRED]
  DESIGN.md → src/components/platform/admin-list.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Security and Integrity Model** — readme_supabase_backend, readme_admin_authorization, readme_row_level_security, readme_database_integrity_model, readme_optimistic_concurrency_control [EXTRACTED 1.00]
- **Tournament Scoring and Ranking Model** — readme_tournament_lifecycle, readme_score_entry_rules, readme_ranking_rules, readme_leaderboard_rules [EXTRACTED 1.00]

## Communities (63 total, 28 thin omitted)

### Community 0 - "shared.tsx"
Cohesion: 0.09
Nodes (57): sonner, Dashboard(), Profile(), Players(), Tournament(), New(), Tournaments(), LeaderboardPage() (+49 more)

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
Nodes (18): ref_node_fs, @playwright/test, contentType, size, alt, contentType, size, SocialImage() (+10 more)

### Community 9 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "payment-actions.ts"
Cohesion: 0.07
Nodes (43): ref_node_crypto, ref_node_url, ref_server_only, standardwebhooks, vitest, zod, POST(), dynamic (+35 more)

### Community 12 - "رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی"
Cohesion: 0.14
Nodes (14): SQL موردنیاز Supabase, اجرای پروژه, انتشار و حدود عملیاتی, تخفیف، رزرو رایگان و معرفی باشگاه, تست, تقویم شمسی و زمان تهران, رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی, ساختار و مسیرها (+6 more)

### Community 13 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, next_types_root_params_d, next_types_routes_d

### Community 16 - "postgres-backend.mjs"
Cohesion: 0.07
Nodes (31): ref_node_http, base64(), matches, names, participants, players, results, rounds (+23 more)

### Community 19 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, prettier, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "20261022111028_platform_expansion.sql"
Cohesion: 0.18
Nodes (8): private.check_slot, public.availability_rules, no_overlapping_slots, public.discover_slots(), public.generate_court_slots(), public.bookings, public.court_slots, public.courts

### Community 21 - "next"
Cohesion: 0.05
Nodes (50): config, next, @supabase/ssr, login(), GET(), metadata, Global Stylesheet, metadata (+42 more)

### Community 23 - "private.calendar_slot_fresh"
Cohesion: 0.20
Nodes (10): private.check_calendar_booking, private.calendar_slot_fresh(), public.discover_slots(), require_fresh_calendar, public.bookings, public.calendar_connections, public.calendar_court_mappings, public.clubs (+2 more)

### Community 24 - "جریان مدیر و کاربر"
Cohesion: 0.50
Nodes (4): بازی باز، سفارش قدیمی و اتصال رزرو خودکار, جریان مدیر و کاربر, رزرو خصوصی جدید: پرداخت، سپس تأیید نهایی, ورود و تکمیل اطلاعات بدون خروج از رزرو

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

### Community 33 - "actions.ts"
Cohesion: 0.07
Nodes (44): @electric-sql/pglite, firebase, changeStatus(), createTournament(), deleteMatch(), deletePlayer(), deleteTournament(), fail() (+36 more)

### Community 34 - "20261022132244_calendar_scheduler.sql"
Cohesion: 0.33
Nodes (4): pg_available_extensions, private.dispatch_calendar_sync(), public.calendar_scheduler_status(), public.calendar_connections

### Community 38 - "Club calendar integration — 2026-10-22"
Cohesion: 0.33
Nodes (5): Club calendar integration — 2026-10-22, Integrity and failure behavior, Supabase advisory review, Validation, Verified production setup

### Community 39 - "20261022132206_calendar_recoverable_mappings.sql"
Cohesion: 0.67
Nodes (3): calendar_active_court, calendar_active_external, public.calendar_court_mappings

### Community 43 - "RallyYar | رالی‌یار"
Cohesion: 0.11
Nodes (17): RallyYar | رالی‌یار, اجزا و حالات, اعتماد، دسترس‌پذیری و SEO, انتخاب تعداد: QuantityStepper, تایپوگرافی و شبکه, تب‌های تغییر مسیر رزرو, جایگاه و وعده, حرکت (+9 more)

### Community 48 - "date-time.ts"
Cohesion: 0.07
Nodes (53): lucide-react, react, Book(), metadata, replacementCalendar(), CreateTournamentForm(), Pending(), AvailabilityPicker() (+45 more)

### Community 49 - "platform/data.ts"
Cohesion: 0.06
Nodes (89): پنل: AdminList و DetailPanel, ManageClubs(), metadata, ManageEvents(), discovered(), errors, Integrations(), metadata (+81 more)

### Community 56 - "README.md"
Cohesion: 0.20
Nodes (3): انتشار ۳۰ مهر ۱۴۰۵, Persian calendar and Tehran time, رالی‌یار؛ اصلاح فرم و یکپارچگی برند

### Community 60 - "پیگیری رزرو، ورود پیامکی و اعلان‌ها"
Cohesion: 0.20
Nodes (10): Firebase Cloud Messaging, Online Payamak و OTP, آزمون مسیر رزرو در مرورگر, زمان‌بندی و تحویل اعلان, فایل‌ها و نقاط ورود, فعال‌سازی و آزمون واقعی, قرارداد وضعیت‌ها و دسترسی‌ها, وضعیت اجرا و بررسی نسخهٔ ۲۰۲۶/۱۰/۲۳ (+2 more)

### Community 63 - "راهنمای انتشار و عملیات"
Cohesion: 0.29
Nodes (7): اجرای jobها, احراز هویت و تصاویر, راهنمای انتشار و عملیات, فعال‌سازی زرین‌پال, قرارداد اتصال مجاز باشگاه, پیش از انتشار, کنترل پس از انتشار و بازیابی

### Community 66 - "توسعه پدل کلاب — ممیزی و طرح انتشار"
Cohesion: 0.40
Nodes (4): برنامه مهاجرت و بازیابی, تصمیم‌های سازگاری, توسعه پدل کلاب — ممیزی و طرح انتشار, ممیزی، ۳۰ مهر ۱۴۰۵

## Knowledge Gaps
- **253 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 435 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `shared.tsx`, `actions.ts`, `package.json`, `platform.test.ts`, `payment-actions.ts`, `date-time.ts`, `platform/data.ts`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `vitest` connect `payment-actions.ts` to `actions.ts`, `calendar-sources.ts`, `package.json`, `platform.test.ts`, `date-time.ts`, `next`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `JalaliDateInput()` connect `date-time.ts` to `README.md`, `platform/data.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `shared.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09185329438493996 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `20261022111120_events_results_and_jobs.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.06685633001422475 - nodes in this community are weakly interconnected._