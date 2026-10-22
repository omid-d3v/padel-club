# Persian calendar and Tehran time

All human-facing date controls now use `JalaliDateInput`, including tournament creation, admin slots/weekly generation, event start and registration deadline, club-hold expiry, open-match filters, and the club booking date-range filter. Month/year navigation, leap Esfand, Persian/Arabic digit typing, 24-hour time selection, clearing optional values, Escape, focus return, required values, and min/max validation are supported.

`src/lib/date-time.ts` is the application authority for Persian calendar conversion, display formatting and the `Asia/Tehran` zone. It uses Intl's Persian calendar rather than an additional calendar package. Date-only values remain civil ISO dates in form submissions and URLs. Date/time values are explicitly interpreted as Tehran wall-clock times on the server and stored as UTC instants; browser/server local timezones cannot shift them. Historical DST offsets are resolved from the IANA timezone rather than assuming a fixed offset.

Native Gregorian date/datetime inputs have been removed from rendered user controls. Their former form field names and API/SQL contracts are preserved through hidden canonical values. Invalid dates fail browser validation and strict server validation. Existing records, external provider requests, SEO machine dates, cron schedules, and financial snapshots remain standard UTC/ISO data. No database migration, Supabase configuration, new dependency or Vercel environment variable is needed.

Verification:

- 35 unit/SQL tests pass. Added date cases cover Nowruz 1403/1404, leap/non-leap Esfand, month-end round trips, Persian/Arabic input, invalid days/hours, Tehran midnight, and historical summer offset.
- 30 desktop/mobile browser tests pass against the real local SQL migrations. New date tests run with the browser set to **America/Los_Angeles**: a selected leap Esfand day produces its correct ISO search date; a Persian 14:30 admin slot persists and redisplays as 14:30 Tehran. The existing request → admin hold → payment-readiness flow also passes using the new Persian control.
- Browser mobile tests use emulation; they are not a claim of physical iOS/Android device testing.
- Lint, TypeScript and production build were checked before release. Screenshots are generated under ignored `test-results/jalali-picker-*.png`.
