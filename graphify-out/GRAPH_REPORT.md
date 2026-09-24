# Graph Report - padel-club  (2026-09-24)

## Corpus Check
- 57 files · ~17,238 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 334 nodes · 719 edges · 22 communities (13 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `447d9d01`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- players/[id]/page.tsx
- package.json
- domain.test.ts
- actions.ts
- Next.js App Router Architecture
- compilerOptions
- shared.tsx
- backend.mjs
- components.json
- dependencies
- devDependencies
- next-env.d.ts
- postcss.config.mjs
- public.match_sets
- ref_next_types_root_params_d_ts
- ref_next_types_routes_d_ts
- data.ts
- app/layout.tsx

## God Nodes (most connected - your core abstractions)
1. `next` - 20 edges
2. `number()` - 20 edges
3. `fullName()` - 20 edges
4. `requireAdmin` - 19 edges
5. `compilerOptions` - 16 edges
6. `cn()` - 15 edges
7. `lucide-react` - 14 edges
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
- `Dashboard()` --calls--> `number()`  [EXTRACTED]
  src/app/(admin)/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Security and Integrity Model** — readme_supabase_backend, readme_admin_authorization, readme_row_level_security, readme_database_integrity_model, readme_optimistic_concurrency_control [EXTRACTED 1.00]
- **Tournament Scoring and Ranking Model** — readme_tournament_lifecycle, readme_score_entry_rules, readme_ranking_rules, readme_leaderboard_rules [EXTRACTED 1.00]

## Communities (22 total, 9 thin omitted)

### Community 0 - "players/[id]/page.tsx"
Cohesion: 0.16
Nodes (22): Dashboard(), Profile(), Players(), Tournament(), New(), Tournaments(), LeaderboardPage(), Leaderboard() (+14 more)

### Community 1 - "package.json"
Cohesion: 0.04
Nodes (39): author, description, engines, node, keywords, license, name, private (+31 more)

### Community 2 - "domain.test.ts"
Cohesion: 0.14
Nodes (17): @electric-sql/pglite, ref_node_fs, ref_node_url, vitest, zod, generateMatches(), SCHEDULE, SLOTS (+9 more)

### Community 3 - "actions.ts"
Cohesion: 0.20
Nodes (18): changeStatus(), createTournament(), deleteMatch(), deletePlayer(), deleteTournament(), fail(), logout(), recalculateTournamentStandings() (+10 more)

### Community 5 - "Next.js App Router Architecture"
Cohesion: 0.09
Nodes (22): Project Knowledge Graph, Graphify Codebase Workflow, Next.js Agent Rules, AGENTS.md Reference, Admin Authorization, Browser Test Strategy, Database-Centric Integrity Model, Database Test Strategy (+14 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "shared.tsx"
Cohesion: 0.12
Nodes (32): config, lucide-react, next, react, sonner, Results(), CreateTournamentForm(), DeletePlayer() (+24 more)

### Community 8 - "backend.mjs"
Cohesion: 0.16
Nodes (17): ref_node_http, base64(), matches, names, participants, players, results, rounds (+9 more)

### Community 9 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 10 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, clsx, @fontsource/vazirmatn, lucide-react, next, @radix-ui/react-dialog, @radix-ui/react-slot (+7 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, prettier, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 13 - "next-env.d.ts"
Cohesion: 0.50
Nodes (3): NOTE: This file should not be edited, next_types_root_params_d, next_types_routes_d

### Community 19 - "data.ts"
Cohesion: 0.17
Nodes (20): login(), dynamic, Login(), LoginForm(), publicDb(), Database, Json, Table (+12 more)

## Knowledge Gaps
- **109 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 149 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `shared.tsx` to `players/[id]/page.tsx`, `package.json`, `actions.ts`, `data.ts`, `app/layout.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `domain.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1422924901185771 - nodes in this community are weakly interconnected._
- **Should `Next.js App Router Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._