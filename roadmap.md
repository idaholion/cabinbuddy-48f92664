# Task Roadmap

## Active (email change process — plan approved 2026-09-15)
- [x] SQL script written: sql-scripts/change-member-email.sql (user runs manually — external Supabase)
- [x] GroupMemberProfile: self-service "Change sign-in email" section (mounted in Account Security card)
- [x] SupervisorUserTools: preview → confirm flow
- [x] useUserRole: lead by name match
- [x] FamilyGroupSetup: redirect guard honors canEdit* flags
- [x] Holly migration: hcook@kw.com → lavenderlily33@gmail.com (applied; duplicate member entry removed)


## Open
- [x] Apply incoming transferred credit to current debt across years, retain surplus, and show subsequent transfers and current balance on the latest stay; covered by focused accounting tests.
- [ ] Verify Tina’s $80 transfer in her signed-in Current & Past Stays — external Supabase does not provide an authenticated test session.
- [ ] Review yearly selection handoff robustness with Richard in the next few days.
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
- [ ] Dana Oct 9-15 payment: Richard/Dana to correct $2,614.12 to $848.53 via Payment History (test of edit flow)
