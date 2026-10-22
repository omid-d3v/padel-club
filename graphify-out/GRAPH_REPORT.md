# Graph Report - padel-club  (2026-10-22)

## Corpus Check
- 132 files · ~169,603 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 599 nodes · 1420 edges · 40 communities (28 shown, 12 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13ed0f91`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Player Admin and Data|Player Admin and Data]]
- [[_COMMUNITY_Project Scripts and Linting|Project Scripts and Linting]]
- [[_COMMUNITY_Tournament Domain and Tests|Tournament Domain and Tests]]
- [[_COMMUNITY_Admin Actions and Validation|Admin Actions and Validation]]
- [[_COMMUNITY_Round Winner Migration and Match Deletion|Round Winner Migration and Match Deletion]]
- [[_COMMUNITY_Architecture and Product Docs|Architecture and Product Docs]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Forms and UI Components|Forms and UI Components]]
- [[_COMMUNITY_Browser Test Backend|Browser Test Backend]]
- [[_COMMUNITY_UI Aliases and Styling|UI Aliases and Styling]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Development Dependencies|Development Dependencies]]
- [[_COMMUNITY_Database Schema and RPC|Database Schema and RPC]]
- [[_COMMUNITY_Generated Next Types|Generated Next Types]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]
- [[_COMMUNITY_Loading Interface|Loading Interface]]
- [[_COMMUNITY_Match Set Round Winners|Match Set Round Winners]]
- [[_COMMUNITY_Generated Root Params Reference|Generated Root Params Reference]]
- [[_COMMUNITY_Generated Routes Reference|Generated Routes Reference]]
- [[_COMMUNITY_Application Data Fetching|Application Data Fetching]]
- [[_COMMUNITY_Application Layout|Application Layout]]
- [[_COMMUNITY_Tournament Deletion Migration|Tournament Deletion Migration]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `requireMember()` - 27 edges
2. `number()` - 27 edges
3. `catalog` - 25 edges
4. `siteUrl()` - 22 edges
5. `createClient()` - 21 edges
6. `money()` - 20 edges
7. `moment()` - 19 edges
8. `Button()` - 18 edges
9. `ActionForm()` - 17 edges
10. `requireAdmin` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Clubs()` --calls--> `catalog`  [INFERRED]
  src/app/(public)/clubs/page.tsx → src/lib/platform/data.ts
- `Events()` --calls--> `catalog`  [INFERRED]
  src/app/(public)/events/page.tsx → src/lib/platform/data.ts
- `Next.js Agent Rules` --conceptually_related_to--> `Next.js App Router Architecture`  [INFERRED]
  AGENTS.md → README.md
- `ManageClubs()` --calls--> `adminRows()`  [INFERRED]
  src/app/(admin)/admin/clubs/page.tsx → src/lib/platform/admin-data.ts
- `Profile()` --calls--> `NotFound()`  [INFERRED]
  src/app/(admin)/players/[id]/page.tsx → src/app/not-found.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Security and Integrity Model** — readme_supabase_backend, readme_admin_authorization, readme_row_level_security, readme_database_integrity_model, readme_optimistic_concurrency_control [EXTRACTED 1.00]
- **Tournament Scoring and Ranking Model** — readme_tournament_lifecycle, readme_score_entry_rules, readme_ranking_rules, readme_leaderboard_rules [EXTRACTED 1.00]

## Communities (40 total, 12 thin omitted)

### Community 0 - "Player Admin and Data"
Cohesion: 0.08
Nodes (62): Dashboard(), CreateTournamentForm(), DeletePlayer(), Pending(), PlayerForm(), Leaderboard(), PlayerList(), BackLink() (+54 more)

### Community 1 - "Project Scripts and Linting"
Cohesion: 0.04
Nodes (47): author, dependencies, class-variance-authority, clsx, @fontsource/vazirmatn, lucide-react, next, @radix-ui/react-dialog (+39 more)

### Community 2 - "Tournament Domain and Tests"
Cohesion: 0.10
Nodes (31): AccountLayout(), metadata, AdminLayout(), metadata, changeStatus(), createTournament(), deleteMatch(), deletePlayer() (+23 more)

### Community 3 - "Admin Actions and Validation"
Cohesion: 0.08
Nodes (49): Account(), beginPayment(), retryVerifyPayment(), errorResult(), PlatformResult, registerAccount(), requestPasswordReset(), updatePassword() (+41 more)

### Community 4 - "Round Winner Migration and Match Deletion"
Cohesion: 0.27
Nodes (10): metadata, robots(), sitemap(), jsonLd(), siteUrl(), catalog, events, Home() (+2 more)

### Community 5 - "Architecture and Product Docs"
Cohesion: 0.09
Nodes (22): Project Knowledge Graph, Graphify Codebase Workflow, Next.js Agent Rules, AGENTS.md Reference, Admin Authorization, Browser Test Strategy, Database-Centric Integrity Model, Database Test Strategy (+14 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "UI Aliases and Styling"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (26): BookingForm(), JoinForm(), Audit, AvailabilityRule, Booking, BookingItem, City, Club (+18 more)

### Community 11 - "Development Dependencies"
Cohesion: 0.11
Nodes (26): errors, int(), iso(), optionalId(), platformAction(), upload(), Slot, normalizeDigits() (+18 more)

### Community 12 - "Database Schema and RPC"
Cohesion: 0.04
Nodes (38): RallyYar | رالی‌یار, اجزا و حالات, اعتماد، دسترس‌پذیری و SEO, تایپوگرافی و شبکه, جایگاه و وعده, حرکت, دارایی‌های اصلی, ساختار صفحه (+30 more)

### Community 15 - "Loading Interface"
Cohesion: 0.13
Nodes (11): AuthorizedBridge, BookingProvider, bookingSchema, configSchema, iso, ProviderBooking, ProviderCapabilities, ProviderSlot (+3 more)

### Community 16 - "Match Set Round Winners"
Cohesion: 0.12
Nodes (15): base64(), matches, names, participants, players, results, rounds, schedule (+7 more)

### Community 19 - "Application Data Fetching"
Cohesion: 0.15
Nodes (11): admin, base64(), db, directory, names, player, queue, schedule (+3 more)

### Community 21 - "Tournament Deletion Migration"
Cohesion: 0.33
Nodes (9): approve(), db, participant(), paySeat(), query(), request(), role(), slot() (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (16): Clubs(), Events(), metadata, Matches(), metadata, ClubCard(), DataNotice(), EventCard() (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (14): NotFound(), Book(), metadata, providerConfigured(), providerFor(), generateMetadata(), Match(), City() (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (6): metadata, seo(), generateMetadata(), metadata, generateMetadata(), metadata

## Knowledge Gaps
- **191 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Tournament Domain and Tests` to `Player Admin and Data`, `Admin Actions and Validation`, `Community 37`, `Community 38`, `Development Dependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `AuthorizedBridge` connect `Loading Interface` to `Admin Actions and Validation`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `number()` connect `Player Admin and Data` to `Admin Actions and Validation`, `Community 37`, `Community 38`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `requireMember()` (e.g. with `ManageEvents()` and `Results()`) actually correct?**
  _`requireMember()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `number()` (e.g. with `Profile()` and `Event()`) actually correct?**
  _`number()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `catalog` (e.g. with `Clubs()` and `Events()`) actually correct?**
  _`catalog` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `siteUrl()` (e.g. with `Club()` and `Event()`) actually correct?**
  _`siteUrl()` has 2 INFERRED edges - model-reasoned connections that need verification._