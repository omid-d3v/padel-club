# Club calendar integration — 2026-10-22

The admin flow is `/admin/integrations` → authenticated, admin-checked RPC → connection/mapping rows → pg_cron/pg_net → authenticated Edge reader → fenced SQL import → `discover_slots` → booking form. The connection interval defaults to 60 minutes and can be changed independently (15–1440 minutes); horizon is 1–14 days.

## Verified production setup

- Supabase project: `bcfbvxmwozmewshctzch`; Edge Function `calendar-sync`, version 1, ACTIVE.
- `rallyyar-calendar-sync` is active on a minute wake-up schedule. Each connection's `next_sync_at` gates network work. `padel-expiry` remains separate.
- Private scheduler token is generated in Vault, never committed or added to Vercel. Edge JWT verification is replaced by explicit token validation through a service-role-only RPC. Missing/invalid tokens both returned HTTP 401.
- Sabaland is assigned to the existing club. User confirmed padel A → `2:3`, padel B → `2:4`, tennis A → `1:1`, tennis B → `1:2`. The first full run at **2026-10-22 13:25:51 UTC** imported **307** source slots, with **0** conflicts. Next run was set one hour later.
- Guilan's five courts were discovered successfully. It remains explicitly `needs_mapping` until an admin assigns the destination club and courts. No duplicate club was fabricated.
- Both official sites exposed public calendars at verification time. Neither login nor a user's password was used. No appointment, cart selection, payment, purchase, cancellation or hold endpoint was called.

## Integrity and failure behavior

Only mapped active courts import. Import uses an advisory transaction lock, a short worker lease, and a fencing token; configuration changes invalidate old work. Missing source slots withdraw only importer-owned inventory inside the complete returned window. Partial, malformed, changed, rate-limited or unavailable responses fail the whole run. Both sources use Tehran times and integer IRR internally (official displayed toman × 10).

Manual slots are preserved and reported as conflicts. Existing booking prices/times and financial records are never rewritten. A new booking is rejected if its imported inventory is unavailable, unmapped, disabled, from a failed connection, or older than the configured interval plus five minutes. Imported availability is an observation, not an upstream hold: manual club approval remains necessary before payment. Turning off a mapping preserves its row and audit history.

## Validation

- 32 unit/SQL tests pass, including all ordered production migrations in PGlite, legacy scoring preservation, RLS, double-claim exclusion, expired-response fencing, existing price snapshots, missing inventory withdrawal and stale-calendar rejection.
- 26 desktop/mobile browser tests pass. After the recoverable-mapping change and mobile navigation update, the four relevant admin/auth browser tests passed again.
- Lint, TypeScript and production Next build pass.
- Live seven-day reads succeeded for each official provider. Bookly pagination is bounded and incomplete coverage fails instead of fabricating empty/free slots.
- PGlite does not implement Supabase networking, Vault or cron. Those boundaries were verified against the deployed function, real cron runs and database results instead.

## Supabase advisory review

New calendar tables have RLS, admin-only read policies and explicit grants. Calendar mutation RPCs check `is_admin()`; worker RPCs are service-role-only. Public `discover_slots` intentionally projects public inventory and checks private freshness without exposing booking owners.

The advisor also reports existing public leaderboard/result definer views, intentional application RPCs and existing Auth password-protection configuration. These were not expanded by this feature. The pg_net extension is non-relocatable and reports its extension metadata in `public`; its networking objects are in `net`. No extension was dropped/reinstalled to alter that metadata on a running scheduler.

References: [definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [extension schema advisory](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anonymous RPC advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated RPC advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Auth password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Deployment/recreation SQL and environment requirements are in the README. Calendar migrations are split into the versioned units actually recorded by Supabase; their contents and order must not be rewritten after deployment.
