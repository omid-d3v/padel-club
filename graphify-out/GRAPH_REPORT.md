# Graph Report - padel-club  (2026-10-23)

## Corpus Check
- 191 files · ~199,327 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1003 nodes · 2517 edges · 70 communities (42 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `818a7c73`
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
- backend.mjs
- ref_next_types_root_params_d_ts
- ref_next_types_routes_d_ts
- devDependencies
- 20261022111028_platform_expansion.sql
- next
- This is NOT the Next.js you know
- private.calendar_slot_fresh
- catalog
- 20261022131605_calendar_connections.sql
- date-time.ts
- scripts
- 20261022143309_booking_benefits.sql
- platform/types.ts
- eslint.config.mjs
- platform/data.ts
- 20261022132244_calendar_scheduler.sql
- operations/page.tsx
- Club calendar integration — 2026-10-22
- 20261022132206_calendar_recoverable_mappings.sql
- BOOKING-CALENDAR-UX.md
- تخفیف و معرفی باشگاه
- RallyYar | رالی‌یار
- engines
- platform-actions.ts
- formatPersianMoment
- public.match_sets
- public.courts
- postgres-backend.mjs
- README.md
- public.calendar_connections
- ref_node_fs
- پیگیری رزرو، ورود پیامکی و اعلان‌ها
- integrations/page.tsx
- قواعد مشترک محصول و پنل
- راهنمای انتشار و عملیات
- @playwright/test
- database.test.ts
- توسعه پدل کلاب — ممیزی و طرح انتشار
- invite-button.tsx
- overrides

## God Nodes (most connected - your core abstractions)
1. `next` - 61 edges
2. `formatPersianMoment()` - 37 edges
3. `number()` - 37 edges
4. `requireMember()` - 35 edges
5. `react` - 34 edges
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

## Communities (70 total, 28 thin omitted)

### Community 0 - "shared.tsx"
Cohesion: 0.08
Nodes (65): lucide-react, sonner, Dashboard(), Profile(), Players(), Tournament(), New(), Tournaments() (+57 more)

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
Cohesion: 0.27
Nodes (10): approve(), db, finish(), participant(), paySeat(), query(), request(), role() (+2 more)

### Community 9 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "payment-actions.ts"
Cohesion: 0.09
Nodes (36): ref_node_crypto, ref_node_url, ref_server_only, standardwebhooks, @supabase/supabase-js, vitest, POST(), dynamic (+28 more)

### Community 12 - "رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی"
Cohesion: 0.14
Nodes (14): SQL موردنیاز Supabase, اجرای پروژه, انتشار و حدود عملیاتی, تخفیف، رزرو رایگان و معرفی باشگاه, تست, تقویم شمسی و زمان تهران, رالی‌یار — پلتفرم فارسی رزرو و هم‌بازی, ساختار و مسیرها (+6 more)

### Community 13 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, next_types_root_params_d, next_types_routes_d

### Community 15 - "providers.ts"
Cohesion: 0.09
Nodes (11): AuthorizedBridge, BookingProvider, bookingSchema, configSchema, iso, ProviderBooking, ProviderCapabilities, ProviderSlot (+3 more)

### Community 16 - "backend.mjs"
Cohesion: 0.16
Nodes (17): ref_node_http, base64(), matches, names, participants, players, results, rounds (+9 more)

### Community 19 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, prettier, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "20261022111028_platform_expansion.sql"
Cohesion: 0.18
Nodes (8): private.check_slot, public.availability_rules, no_overlapping_slots, public.discover_slots(), public.generate_court_slots(), public.bookings, public.court_slots, public.courts

### Community 21 - "next"
Cohesion: 0.07
Nodes (35): config, next, @supabase/ssr, login(), logout(), AdminLayout(), dynamic, metadata (+27 more)

### Community 23 - "private.calendar_slot_fresh"
Cohesion: 0.20
Nodes (10): private.check_calendar_booking, private.calendar_slot_fresh(), public.discover_slots(), require_fresh_calendar, public.bookings, public.calendar_connections, public.calendar_court_mappings, public.clubs (+2 more)

### Community 24 - "catalog"
Cohesion: 0.08
Nodes (31): Global Stylesheet, metadata, City(), generateMetadata(), Clubs(), metadata, Club(), generateMetadata() (+23 more)

### Community 25 - "20261022131605_calendar_connections.sql"
Cohesion: 0.27
Nodes (10): calendar_due, calendar_runs_recent, imported_calendar_slots, public.calendar_connections, public.calendar_court_mappings, public.calendar_sync_runs, public, public.clubs (+2 more)

### Community 26 - "date-time.ts"
Cohesion: 0.10
Nodes (38): Book(), metadata, Matches(), metadata, AvailabilityPicker(), AvailableSlot, BookingMode, BookingModeTabs() (+30 more)

### Community 27 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, lint, start, test, test:e2e (+1 more)

### Community 29 - "20261022143309_booking_benefits.sql"
Cohesion: 0.29
Nodes (6): auth.users, audit_platform_change, public.booking_benefits, public.discount_codes, private.audit_change, public.booking_participants

### Community 30 - "platform/types.ts"
Cohesion: 0.10
Nodes (26): BookingForm(), Audit, AvailabilityRule, Booking, BookingItem, CalendarConnection, City, Club (+18 more)

### Community 33 - "platform/data.ts"
Cohesion: 0.13
Nodes (23): Notifications(), Account(), Profile(), Results(), registerPush(), unregisterPush(), dynamic, metadata (+15 more)

### Community 34 - "20261022132244_calendar_scheduler.sql"
Cohesion: 0.33
Nodes (4): pg_available_extensions, private.dispatch_calendar_sync(), public.calendar_scheduler_status(), public.calendar_connections

### Community 35 - "operations/page.tsx"
Cohesion: 0.14
Nodes (17): پنل: AdminList و DetailPanel, react, metadata, sections, metadata, replacementCalendar(), ActionForm(), AdminList() (+9 more)

### Community 38 - "Club calendar integration — 2026-10-22"
Cohesion: 0.33
Nodes (5): Club calendar integration — 2026-10-22, Integrity and failure behavior, Supabase advisory review, Validation, Verified production setup

### Community 39 - "20261022132206_calendar_recoverable_mappings.sql"
Cohesion: 0.67
Nodes (3): calendar_active_court, calendar_active_external, public.calendar_court_mappings

### Community 43 - "RallyYar | رالی‌یار"
Cohesion: 0.17
Nodes (12): RallyYar | رالی‌یار, اجزا و حالات, اعتماد، دسترس‌پذیری و SEO, تایپوگرافی و شبکه, تب‌های تغییر مسیر رزرو, جایگاه و وعده, حرکت, دارایی‌های اصلی (+4 more)

### Community 48 - "platform-actions.ts"
Cohesion: 0.11
Nodes (38): zod, changeStatus(), createTournament(), deleteMatch(), deletePlayer(), deleteTournament(), fail(), recalculateTournamentStandings() (+30 more)

### Community 49 - "formatPersianMoment"
Cohesion: 0.22
Nodes (24): ManageClubs(), ManageEvents(), Integrations(), Operations(), Bookings(), Payments(), Event(), generateMetadata() (+16 more)

### Community 54 - "postgres-backend.mjs"
Cohesion: 0.14
Nodes (12): admin, base64(), db, directory, mobilePlayer, names, player, queue (+4 more)

### Community 56 - "README.md"
Cohesion: 0.15
Nodes (6): انتشار ۳۰ مهر ۱۴۰۵, Persian calendar and Tehran time, باقی‌مانده برای انتشار واقعی, دامنه تست, گزارش تحویل مرحله‌ای, رالی‌یار؛ اصلاح فرم و یکپارچگی برند

### Community 59 - "ref_node_fs"
Cohesion: 0.17
Nodes (7): ref_node_fs, contentType, size, alt, contentType, size, SocialImage()

### Community 60 - "پیگیری رزرو، ورود پیامکی و اعلان‌ها"
Cohesion: 0.20
Nodes (10): Firebase Cloud Messaging, Online Payamak و OTP, جریان مدیر و کاربر, زمان‌بندی و تحویل اعلان, فایل‌ها و نقاط ورود, فعال‌سازی و آزمون واقعی, قرارداد وضعیت‌ها و دسترسی‌ها, وضعیت اجرا و بررسی نسخهٔ ۲۰۲۶/۱۰/۲۳ (+2 more)

### Community 61 - "integrations/page.tsx"
Cohesion: 0.22
Nodes (7): discovered(), errors, metadata, sources, statuses, CalendarStatusRefresh(), Tables

### Community 62 - "قواعد مشترک محصول و پنل"
Cohesion: 0.32
Nodes (5): انتخاب تعداد: QuantityStepper, حساب، آیکون و حرکت, قواعد مشترک محصول و پنل, MemberNav(), RallyLoader()

### Community 63 - "راهنمای انتشار و عملیات"
Cohesion: 0.25
Nodes (7): اجرای jobها, احراز هویت و تصاویر, راهنمای انتشار و عملیات, فعال‌سازی زرین‌پال, قرارداد اتصال مجاز باشگاه, پیش از انتشار, کنترل پس از انتشار و بازیابی

### Community 65 - "database.test.ts"
Cohesion: 0.38
Nodes (5): @electric-sql/pglite, db, query(), role(), save()

### Community 66 - "توسعه پدل کلاب — ممیزی و طرح انتشار"
Cohesion: 0.40
Nodes (4): برنامه مهاجرت و بازیابی, تصمیم‌های سازگاری, توسعه پدل کلاب — ممیزی و طرح انتشار, ممیزی، ۳۰ مهر ۱۴۰۵

## Knowledge Gaps
- **249 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+244 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 420 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `shared.tsx`, `platform/data.ts`, `operations/page.tsx`, `package.json`, `payment-actions.ts`, `platform-actions.ts`, `formatPersianMoment`, `catalog`, `date-time.ts`, `ref_node_fs`, `integrations/page.tsx`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `vitest` connect `payment-actions.ts` to `database.test.ts`, `calendar-sources.ts`, `package.json`, `platform.test.ts`, `platform-actions.ts`, `next`, `date-time.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `JalaliDateInput()` connect `date-time.ts` to `README.md`, `shared.tsx`, `platform/data.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _249 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `shared.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08193979933110368 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `20261022111120_events_results_and_jobs.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.06685633001422475 - nodes in this community are weakly interconnected._