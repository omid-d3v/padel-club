# Graph Report - padel-club  (2026-09-23)

## Corpus Check
- Corpus is ~15,347 words - fits in a single context window. You may not need a graph.

## Summary
- 320 nodes · 700 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Player Admin and Data
- Project Scripts and Linting
- Tournament Domain and Tests
- Admin Actions and Validation
- Supabase Auth and Server
- Architecture and Product Docs
- TypeScript Configuration
- Forms and UI Components
- Browser Test Backend
- UI Aliases and Styling
- Runtime Dependencies
- Development Dependencies
- Generated Next Types
- PostCSS Configuration

## God Nodes (most connected - your core abstractions)
1. `next` - 20 edges
2. `number()` - 20 edges
3. `fullName()` - 20 edges
4. `requireAdmin` - 17 edges
5. `compilerOptions` - 16 edges
6. `cn()` - 15 edges
7. `lucide-react` - 13 edges
8. `react` - 12 edges
9. `Button()` - 12 edges
10. `getPlayers` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Agent Rules` --conceptually_related_to--> `Next.js App Router Architecture`  [INFERRED]
  AGENTS.md → README.md
- `AGENTS.md Reference` --references--> `Next.js Agent Rules`  [EXTRACTED]
  CLAUDE.md → AGENTS.md
- `AGENTS.md Reference` --references--> `Graphify Codebase Workflow`  [EXTRACTED]
  CLAUDE.md → AGENTS.md
- `AdminLayout()` --calls--> `requireAdmin`  [EXTRACTED]
  src/app/(admin)/layout.tsx → src/lib/auth.ts
- `Profile()` --calls--> `getBadges()`  [EXTRACTED]
  src/app/(admin)/players/[id]/page.tsx → src/lib/tournament/badges.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tournament Scoring and Ranking Model** — readme_tournament_lifecycle, readme_score_entry_rules, readme_ranking_rules, readme_leaderboard_rules [EXTRACTED 1.00]
- **Supabase Security and Integrity Model** — readme_supabase_backend, readme_admin_authorization, readme_row_level_security, readme_database_integrity_model, readme_optimistic_concurrency_control [EXTRACTED 1.00]

## Communities (16 total, 3 thin omitted)

### Community 0 - "Player Admin and Data"
Cohesion: 0.12
Nodes (41): Dashboard(), Profile(), Players(), Tournament(), New(), Tournaments(), LeaderboardPage(), Results() (+33 more)

### Community 1 - "Project Scripts and Linting"
Cohesion: 0.05
Nodes (37): author, description, engines, node, keywords, license, name, private (+29 more)

### Community 2 - "Tournament Domain and Tests"
Cohesion: 0.11
Nodes (25): @electric-sql/pglite, ref_node_fs, ref_node_url, vitest, Database, Json, Table, View (+17 more)

### Community 3 - "Admin Actions and Validation"
Cohesion: 0.15
Nodes (22): zod, changeStatus(), createTournament(), deletePlayer(), fail(), logout(), recalculateTournamentStandings(), refresh() (+14 more)

### Community 4 - "Supabase Auth and Server"
Cohesion: 0.13
Nodes (13): config, next, @supabase/ssr, login(), Global Stylesheet, metadata, dynamic, Login() (+5 more)

### Community 5 - "Architecture and Product Docs"
Cohesion: 0.09
Nodes (22): Project Knowledge Graph, Graphify Codebase Workflow, Next.js Agent Rules, AGENTS.md Reference, Admin Authorization, Browser Test Strategy, Database-Centric Integrity Model, Database Test Strategy (+14 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "Forms and UI Components"
Cohesion: 0.27
Nodes (11): lucide-react, react, sonner, DeletePlayer(), Pending(), PlayerForm(), PlayerAvatar(), Dialog() (+3 more)

### Community 8 - "Browser Test Backend"
Cohesion: 0.16
Nodes (17): ref_node_http, base64(), matches, names, participants, players, results, rounds (+9 more)

### Community 9 - "UI Aliases and Styling"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, clsx, @fontsource/vazirmatn, lucide-react, next, @radix-ui/react-dialog, @radix-ui/react-slot (+7 more)

### Community 11 - "Development Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, prettier, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 13 - "Generated Next Types"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, ref_next_types_root_params_d_ts, ref_next_types_routes_d_ts

## Knowledge Gaps
- **109 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Supabase Auth and Server` to `Player Admin and Data`, `Project Scripts and Linting`, `Admin Actions and Validation`, `Forms and UI Components`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Project Scripts and Linting`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `Project Scripts and Linting`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Player Admin and Data` be split into smaller, more focused modules?**
  _Cohesion score 0.11779448621553884 - nodes in this community are weakly interconnected._
- **Should `Project Scripts and Linting` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Tournament Domain and Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._