# Task Roadmap

## Active (email change process — plan approved 2026-09-15)
- [x] SQL script written: sql-scripts/change-member-email.sql (user runs manually — external Supabase)
- [x] GroupMemberProfile: self-service "Change sign-in email" section (mounted in Account Security card)
- [x] SupervisorUserTools: preview → confirm flow
- [x] useUserRole: lead by name match
- [x] FamilyGroupSetup: redirect guard honors canEdit* flags
- [x] Holly migration: hcook@kw.com → lavenderlily33@gmail.com (applied; duplicate member entry removed)


## Open
- [ ] Replace blanket reservation-extension block with availability, turn, and family-limit checks; test safeguards.
- [ ] Selection-process conversation: back-to-back picks vs one multi-week pick (Debbie's case) — user wants to discuss
- [ ] Verify selection counter + multi-week booking prompts in preview (needs a sign-in)
- [ ] Family Group Setup hint about delegate checkboxes (optional)
- [ ] Template-layer supervisor propagation — deferred to off-season queue
- [ ] Payment transaction ledger — off-season queue
- [ ] Review 3 critical findings in Security scan

## Done
- [x] Credit-transfer math verified by user ($1 to Sam)
- [x] "Didn't use this stay" (Option A) — Stay History, Upcoming Reservations, standalone button
- [x] Notification Management: Delivery History tab, dropdown sections, mobile layout
- [x] Selection counter counts main-round picks and short stays (weeks booked)
- [x] Multi-week booking clarity: nights label, drag tip, Combine / Keep Separate prompt

