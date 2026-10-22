# Day-first booking calendar

The booking flow now starts with a seven-day Persian date strip, actual available-slot counts and grouped time cards. Each card shows Tehran start/end time, duration and court price. Selected states, unavailable states, empty-day recovery and a selection receipt replace the previous long select menu. Changing the day or booking kind clears the previous slot. Final submission is disabled unless the slot remains eligible; server booking checks remain authoritative.

Visitors can inspect public availability before signing in. Continuing to login preserves the court, date window and chosen slot; the slot is revalidated against the current inventory when the booking page opens. Users with an incomplete profile can also browse before completing it. Court switching is explicit. The full date-range calendar is available under an expandable advanced-date control, keeping nearby days first.

The same DayStrip is used inside every shared Persian date picker. Admin date/time dialogs have nearby-day shortcuts, quick hours and the existing exact-minute controls. All dates remain Persian; all hours remain Tehran, and API/database contracts are unchanged. No migration or environment changes are needed.

Interaction references: [Playtomic date and time booking](https://playerhelp.playtomic.com/hc/en-gb/articles/19831881490449-How-to-make-a-reservation-in-Playtomic-app), [LTA court slot selection](https://www.lta.org.uk/support-centre/playing/book-a-court/how-do-i-book-a-tennis-court/). The implementation is specific to RallyYar's RTL brand, manual approval and available data; it does not imply a third-party reservation was made.

Validation: 35 unit/SQL tests and 32 desktop/mobile browser tests passed. The browser flow selects a day and real SQL slot, submits a booking, obtains an admin hold and verifies payment readiness. A visitor test covers slot preview, login continuation, clearing the choice on day change, empty states and horizontal overflow. Screenshots are saved in ignored test-results/booking-calendar-*.png. Mobile checks use browser emulation, not physical-device certification.
