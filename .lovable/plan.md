
# Family Group Delegate Permissions

Add three per-member permission toggles on the Family Group Setup page so any host member can be authorized to act on behalf of the whole family group across Reservations, Daily/Final Input, and Stay History. Group Leads implicitly have all three.

## The three permissions (per host member)

1. **Can Edit Reservations** — view any group reservation on the calendar, and create/edit/cancel reservations on behalf of any group member.
2. **Can Edit Daily & Final Input** — open and edit the Daily and Final Input (departure) page for any group member's stay (subsumes the old Departure Checklist item).
3. **Can Edit Stay History** — open and edit Stay History entries for any group member.

**Defaults:** all three ON when a new host member is added. Group Lead's own row shows a locked "Lead — full delegate access" indicator instead of checkboxes.

**Who can toggle:** Group Lead of that group and Org Admin only. Regular members see the checkboxes as read-only.

## Data model

`family_groups.host_members` is already a JSONB array of member objects (with `name`, `email`, `canHost`, etc.). Extend each member object with:

```
canEditReservations: boolean   // default true
canEditDailyFinal:   boolean   // default true
canEditStayHistory:  boolean   // default true
```

No schema migration required — JSONB is flexible. A one-time backfill (via `supabase--insert`) will set all three flags to `true` on every existing host member that lacks them, so current behavior for existing groups matches the "default on" rule.

**Audit trail (new column):**
Add `edited_by_user_id UUID` to the tables edited via delegation, so Stay History can show "Edited by Eli on behalf of Tina":
- `reservations.edited_by_user_id`
- `checkin_sessions.edited_by_user_id` (Daily/Final input)
- Stay History is snapshot-based; the underlying `reservations` / `checkin_sessions` edits already cover this.

A single migration adds the columns (nullable) plus a small trigger that stamps `edited_by_user_id = auth.uid()` on every UPDATE. Reads join `auth.users` via the existing `get_organization_user_emails` pattern to resolve a display name.

## Permission resolution (single source of truth)

New hook `useDelegatePermissions(targetUserId?)` returns:

```
{
  canEditReservations: boolean,
  canEditDailyFinal:   boolean,
  canEditStayHistory:  boolean,
  isDelegating:        boolean,   // true when acting on someone else's data
  delegateForFamilyGroup: string | null,
}
```

Logic:
1. Look up the current user's family group (via existing `useUserRole` / `member_profile_links`).
2. If they are the Group Lead → all three true for that group.
3. Otherwise, read their `host_members` entry and return its three flags.
4. Org Admin retains existing "view as any user" impersonation (unchanged).

## Enforcement points

Frontend gates (hide/disable UI when the flag is false):
- **Calendar / PropertyCalendar** — allow selecting/editing any reservation whose `family_group` matches the delegate's group when `canEditReservations`.
- **CheckoutList / CheckoutFinal (Daily & Final Input)** — allow opening another group member's session when `canEditDailyFinal`.
- **StayHistory** — enable the edit controls on rows belonging to any group member when `canEditStayHistory`.

Backend gates (RLS updates in the same migration):
- Add a SECURITY DEFINER helper `public.user_has_delegate_permission(_org_id uuid, _family_group text, _permission text)` that inspects the caller's `host_members` entry.
- Update RLS UPDATE/INSERT policies on `reservations`, `checkin_sessions`, and any Stay History edit policies to allow the operation when `user_has_delegate_permission(...)` returns true for the appropriate flag.

## UI changes on Family Group Setup

For each host member row, next to the existing "Can Host" checkbox, render three checkboxes in a compact group:

```
[x] Can Host    [x] Edit Reservations   [x] Edit Daily/Final   [x] Edit Stay History
```

Group Lead row shows a single pill: **"Lead — full delegate access"** (no checkboxes).

If the current viewer is not the Lead / Org Admin, the checkboxes render disabled with a small tooltip: "Only the Group Lead or an Admin can change these."

Add a short helper paragraph at the top of the members section explaining the concept in one sentence.

## Suggested improvements adopted

- **Audit trail** — `edited_by_user_id` on `reservations` and `checkin_sessions`, stamped by trigger; surfaced as "Edited by X on behalf of Y" on Stay History rows and Daily/Final read-only headers.
- **Lead is always a delegate** — Lead's own row displays the locked pill; hook short-circuits to all-true for the Lead.

## Improvements NOT adopted (per your answers)

- No combined "Family Delegate" quick-toggle (keeping just the three checkboxes).
- No "Editing on behalf of…" banner on delegate pages (audit trail covers accountability without extra UI chrome).

## Files touched (approximate)

- `supabase/migrations/…` — new columns + trigger + RLS policy updates + helper function.
- One-time data patch via `supabase--insert` to backfill the three flags on existing `host_members`.
- `src/types/group-member.ts` — add three fields to `GroupMember`.
- `src/hooks/useDelegatePermissions.ts` (new).
- `src/pages/FamilyGroupSetup.tsx` — render the three checkboxes + Lead pill + permission gating.
- `src/pages/CheckoutList.tsx`, `src/pages/CheckoutFinal.tsx` — allow group-scoped access when `canEditDailyFinal`.
- `src/pages/StayHistory.tsx` — enable edit controls when `canEditStayHistory`; show "Edited by X on behalf of Y".
- `src/components/PropertyCalendar.tsx` (and reservation create/edit dialogs) — allow group-scoped edit when `canEditReservations`.

## Rollout order

1. Migration (columns, trigger, helper function, RLS updates).
2. Backfill flags on existing `host_members`.
3. Types + hook.
4. Family Group Setup UI (visible, editable).
5. Wire the hook into the four consumer pages.
6. Add "Edited by … on behalf of …" line in Stay History and Daily/Final headers.
