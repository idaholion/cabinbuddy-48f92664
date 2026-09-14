# Family group visibility: leads, delegates, and Stay History

## What I found

Three related things, all in the same wiring:

1. **You did add the member permissions.** Every member card in Family Group Setup has three checkboxes — Reservations, Daily/Final, Stay History — on by default, and the group lead always has all three.
2. **Those permissions don't do anything yet.** They only decide whether the "Delegate view" dropdown appears on a page. The app only actually switches identity when an *admin* picks someone. So Eli picks Tina and nothing changes — and the new "changes are disabled while viewing as someone" rule would block him from saving even if it did.
3. **Tina not seeing her whole family is a separate bug.** Stay History already intends group leads to see every stay in their family group, so something in the lead detection is failing for her and she falls back to member-only rules.

## What will change

1. **Confirm and fix Tina's lead detection** so a real group lead sees all of their family's stays on Stay History — both when she signs in and in "View as Tina" mode.
2. **Make delegate access real.** When Eli (or any member with the Daily/Final permission) picks Tina in the dropdown, the page loads her stay and lets him fill it in. Saves are allowed — they are recorded as made by Eli on Tina's behalf, so the trail stays honest.
3. **Keep the admin rule unchanged:** an admin viewing as someone is still strictly read-only, as approved earlier. Only permission-based delegate access allows edits, and only on the pages the checkboxes allow.
4. **Add a simple toggle for group leads** on Stay History: **My stays | Whole family** (default: Whole family), so a lead can narrow to just their own. Regular members see no toggle.

## Out of scope

- No change to what admins see on "All Family Groups".
- No new permission types; the existing three checkboxes stay as they are.

## Technical notes

- Diagnosis first: check the Comeau `family_groups` row (`lead_email`, `lead_name`, `host_members[0]`) against Tina's profile and `member_profile_links`, and `useEffectiveRole`'s lead matching, before changing code.
- `ImpersonationContext.isImpersonating` is currently `!!target && isAdmin`, so delegate selections are inert. Split into two modes on the context: `mode: 'admin-view' | 'delegate'`, where delegate requires `useDelegatePermissions().forGroup(target.familyGroup)` to grant the page's scope. `useEffectiveUser` honours both; `useEffectiveRole` strips admin flags in both.
- Write guards (`blockWhileImpersonating`, `toggleTask` guard) fire only in `admin-view` mode. In delegate mode, save handlers keep the acting user's id in `created_by_user_id` / audit fields while the record targets the selected member; log via `logAction`.
- `ViewAsUserPicker` banner text becomes mode-aware: amber read-only for admin view, a neutral "Editing on behalf of X" banner for delegates.
- Stay History: `canViewReservation` should also allow a delegate holding `canEditStayHistory` for that group; add lead toggle state rendered when `isGroupLead && !isAdmin`, applying the existing host-match test when set to "My stays".
- Verify on the preview: Tina sees all Comeau stays; the lead toggle narrows correctly; a delegate can open and save another member's Daily/Final input.
