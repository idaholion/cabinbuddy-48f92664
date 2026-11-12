# Task Roadmap

## Active (email change process — plan approved 2026-09-15)
- [x] SQL script written: sql-scripts/change-member-email.sql (user runs manually — external Supabase)
- [x] GroupMemberProfile: self-service "Change sign-in email" section (mounted in Account Security card)
- [x] SupervisorUserTools: preview → confirm flow
- [x] useUserRole: lead by name match
- [x] FamilyGroupSetup: redirect guard honors canEdit* flags
- [x] Holly migration: hcook@kw.com → lavenderlily33@gmail.com (applied; duplicate member entry removed)


## Open
- [x] Repair notification-only active-round completion checks; deployed sender and scheduled checker. Holly's email accepted and text queued Nov 8 at 9:01 PM Denver; waiting-family and repeat-send checks skipped correctly. Eight notification tests and fifteen selection regressions passed; all 46 reservations, secondary turns, and usage fingerprints unchanged. Future handoffs await the families' actual Done actions.
- [ ] Verify the Departure Checklist box only appears while the current stay is in progress — external Supabase does not provide a test session.

- [x] Apply incoming transferred credit to current debt across years, retain surplus, and show subsequent transfers and current balance on the latest stay; covered by focused accounting tests.
- [ ] Verify Tina’s $80 transfer in her signed-in Current & Past Stays — external Supabase does not provide an authenticated test session.
- [x] Read-only 2027 selection audit completed; primary complete, secondary active, saved-limit and phase-display concerns identified without changing data.
- [x] Record the agreed selection-hardening sequence and safeguards below.
- [x] Fix direct-login claimed-profile recognition and align the secondary banner with the calendar selection year; 34 identity and selection safeguard tests passed.
- [x] Fix primary-to-secondary handoff using fresh target-year completion and reverse rotation; 28 selection safeguard tests passed.
- [ ] Verify Tina's third-week selection in the signed-in UI — external Supabase cannot provide a test session.
- [x] Use target-year settings and fresh primary/secondary turn checks for every new reservation; preserve explicit Done handoff. Eleven new tests and nine extension regressions passed.
- [ ] Verify new-booking turn enforcement in the signed-in UI — external Supabase cannot provide a test session.
- [x] Replace blanket reservation-extension block with availability, turn, and family-limit checks; nine safeguard tests passed.
- [ ] Verify reservation extension through the signed-in UI — external Supabase does not provide a test session.
- [ ] Selection-process conversation: back-to-back picks vs one multi-week pick (Debbie's case) — user wants to discuss
- [ ] Verify selection counter + multi-week booking prompts in preview (needs a sign-in)
- [ ] Family Group Setup hint about delegate checkboxes (optional)
- [ ] Template-layer supervisor propagation — deferred to off-season queue
- [ ] Payment transaction ledger — off-season queue
- [ ] Review 3 critical findings in Security scan

## Phase 1 — after Round 2 (Nov 12)
- [x] Status menu shows free-selection state (on hold / open / not enabled) instead of a family order.
- [x] Hold period setting (days + Mountain opening time, default 7 PM) with booking lock, announcement, and day-before reminder.
- [x] Hold SQL applied and 2027 opening configured; Richard confirmed the calendar and published Phase 1.
- [x] "Are you done selecting?" prompt after a family's last pick of the round.
- [ ] Verify all three in the signed-in calendar (no test session available).

## Selection hardening — agreed sequence

- [x] Phase 2 saved-limit cleanup applied by Richard Nov 12; read-only verification confirms 2026/2027 primary limit 2, secondary limit 1, no active turn, and unlimited post-rotation weeks.
- [x] Separate round completion plan approved; reader/writer and database-trigger inventory recorded in docs/SELECTION_ROUND_COMPLETION_TRANSITION.md.
- [x] Additive separate-completion SQL prepared with finished-season guards and legacy-field preservation; shared completion reader covered by focused tests, not yet enabled in calendar consumers.
- [x] Separate completion fields applied by Richard and independently verified: all twelve reviewed family/year rows have both flags true; original varied usage counts preserved, including Debbie's zero second-round bookings.
- [x] Usage reconciliation now uses protected organization queries, never infers Done from bookings, and skips active or finished seasons.
- [ ] Richard to run supabase/sql/2026-11-12_atomic_round_completion.sql; then switch completion readers and handoff progression together. Blocked on atomic trigger installation.

**Safeguards:** Preserve every existing reservation for every year. Never reset completed turns, move the season backward, rewrite active-round limits or usage, or disable working booking features.

1. [x] Dana Grandy finished her turn, reported by Richard Nov 7; Richard's quiet window is available.
2. [ ] In that window, implement and verify display-only hardening: load the banner and status dropdown from consistent saved target-year state, refresh when the viewed person or year changes and after handoffs, and replace hardcoded/default phase text with accurate loading and saved-state displays. No stored selection data changes. Publish only with Richard's explicit approval.
   - [x] Early piece done (Nov 2, in preview, not yet published): late answers for the wrong year are ignored and failed reads retry instead of showing Round 1. Remaining: hardcoded "Selection begins October 1st" text and a clear loading state.
   - [x] Preview implementation: compact schedule for both rounds, loading barrier, refresh on accepted bookings/person changes/Done, read-only reservation tally when saved usage lags; no saved records changed. Focused schedule/count and booking regression tests pass.
   - [ ] Richard to verify Andrew's banner and booking count in signed-in preview, then approve publishing; external Supabase does not provide an authenticated test session.
3. [ ] Confirm Andrew's secondary turn displays correctly and existing reservations and completed turns remain unchanged before Richard resumes selecting.
4. [x] Entire 2027 secondary round finished; Richard applied saved-limit corrections and approved the separate-round completion plan. External Supabase SQL remains manual.
5. [ ] After the round ends, design the annual rollover/pre-flight workflow: validate target-year settings, rotation, round status, and booking/usage consistency before future seasons begin. Initialization must preserve existing seasons and never reset an active or completed round.
6. [ ] Yearly reminders for Admin and calendar keeper: setup reminder ~60 days before selection opens, pre-flight check ~14 days before, "ready" confirmation ~3 days before, plus an end-of-season wrap-up check. Uses the existing daily automated-notification job, not a new frequent one.

**Current blockers:** Separate-round consumers wait for Richard to install atomic completion triggers. Signed-in checks are unavailable through external Supabase. Annual pre-flight/reminders follow completion of this checkpoint. Existing reservations and completed turn state must remain unchanged.

## Done
- [x] Exclude actual split-connected payments from orphaned-payment warnings without modifying financial records; covered by five focused tests.
- [x] Removed the second duplicate $80 Mallory-to-Tina credit transfer; verified only the original $80 transfer remains.
- [x] Credit-transfer math verified by user ($1 to Sam)
- [x] "Didn't use this stay" (Option A) — Stay History, Upcoming Reservations, standalone button
- [x] Notification Management: Delivery History tab, dropdown sections, mobile layout
- [x] Selection counter counts main-round picks and short stays (weeks booked)
- [x] Multi-week booking clarity: nights label, drag tip, Combine / Keep Separate prompt
- [x] Single cost breakdown on Current & Past Stays: top section no longer repeats the newest stay's bill when that stay's card is shown in the ledger below



- [x] Payment lines: each payment is a dated, editable line in Payment History (payer + Admin/Treasurer), with change log, double-click and overpayment guards. Needs supabase/sql/2026-10-31_payment_transactions.sql run in Supabase.
- [x] Dana Oct 9-15 payment confirmed at $848.53 in saved payment and transaction; old $2,614.12 appears only in deletion audit history.
