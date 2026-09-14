# Stay History: fix lead visibility, add "My stays / Whole family" toggle

## What's happening today

Stay History already intends group leads to see every stay in their family group, so Tina seeing only her own is a bug: her lead detection is failing and she falls back to regular-member rules.

## What will change

1. **Confirm the cause, then fix Tina's lead detection** so a real group lead sees all of their family's stays on Stay History — both when she signs in herself and in "View as Tina" mode. Summary totals (charges, paid, credit) follow the same set of stays.
2. **Add a toggle for group leads** at the top of the page: **My stays | Whole family**, default Whole family. "My stays" narrows the list and the totals to stays the lead personally hosted. Regular members don't see the toggle — they only ever have their own stays.

## Out of scope for now

- Member permissions / delegate access (Eli filling in Tina's Daily & Final). I'll explain what does and doesn't work there, with options, once this is done.
- No change to admin behaviour or to "All Family Groups".

## Technical notes

- Diagnose before changing code: check the Comeau `family_groups` row (`lead_email`, `lead_name`, `host_members[0]`) against Tina's profile and `member_profile_links`, and the lead matching in `useEffectiveRole` (email/name comparison while impersonating).
- Fix likely lands in `useEffectiveRole.ts` lead matching and/or `StayHistory.tsx` `canViewReservation`, which depends on `userFamilyGroup?.name` being populated for leads.
- Toggle: local state in `StayHistory.tsx`, rendered only when `isGroupLead && !isAdmin` (including the impersonated equivalent); "My stays" reuses the existing primary-host email test with `user_id` fallback, applied in `filteredReservations` so summaries stay consistent.
- Verify on the preview in "View as Tina Comeau": all Comeau stays listed, toggle narrows to hers, totals match the list.
