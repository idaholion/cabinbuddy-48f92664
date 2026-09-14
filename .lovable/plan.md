# Group leads: see whole family on Stay History (plus optional "just me" toggle)

## Opinion

Two separate things are tangled together here:

1. **Tina not seeing her whole family is a bug, not a design gap.** The page already intends group leads to see every stay for their family group (`canViewReservation` allows it when the lead's group matches the stay's group). Something in the lead detection is failing for her, so she falls back to "regular member" rules and only sees stays she personally hosts.
2. **A "just me / whole family" toggle for leads is worth adding — and it's not too complicated.** It reuses filtering logic the page already has; it's one small control shown only to group leads. It matches how leads actually think: sometimes they want the family's money picture, sometimes just their own.

## What will change

1. **Fix the lead-visibility bug (first step: confirm the cause).** Check the Comeau family group's lead name/email fields against Tina's profile, and the lead-matching logic in `useEffectiveRole`, to find why Tina isn't recognized as lead. Fix so a real group lead sees all their family's stays, both in "View as Tina" mode and when Tina signs in herself.
2. **Add a simple toggle for group leads** at the top of Stay History: **My stays | Whole family** (default: Whole family). "My stays" narrows the list to stays where the lead is personally the host. Regular members see no toggle (they only ever have their own stays anyway).
3. Summary cards (charges, paid, credit) follow the toggle, so the totals always match what's listed.

## Out of scope

- No change to what regular members see.
- No change to admin "All Family Groups" behavior.

## Technical notes

- Diagnosis first: query `family_groups` for the Comeau group (`lead_email`, `lead_name`) and compare with Tina's `member_profile_links` / auth email; also verify `useEffectiveRole`'s `isLead` matching handles her record while impersonating.
- Fix likely lands in `useEffectiveRole.ts` (lead matching) and/or the data (mismatched lead email), plus `StayHistory.tsx` `canViewReservation` if `userFamilyGroup?.name` is undefined for leads.
- Toggle: local state in `StayHistory.tsx`, rendered only when `isGroupLead && !isAdmin`; when set to "my", apply the same host-matching test regular members use (primary host email, fallback `user_id`).
- Verify with the preview in "View as Tina Comeau" mode: whole family stays listed, toggle narrows to her own.
