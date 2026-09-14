# Simplify delegate permissions: checkbox = act as lead, no dropdown

## Your question answered: what does the dropdown do today?

The "Delegate view" / "Act on behalf of" dropdown was an extra step I built: a member with permissions picks a person from their family group, and the page then behaves as if they were that person. You were right to question it — it adds a second identity concept, it's confusing, and it's not what you asked for.

## What you actually want (and what this plan builds)

The checkboxes in Family Group Setup mean one thing: **this member can make changes on their own family group's pages as if they were the group lead.**

So Eli, with the boxes checked, just opens Daily & Final Input and fills in the checkout for his mom's stay — no dropdown, no identity switching. If Tina unchecks his boxes, Eli can only touch his own stays.

Abuse is naturally limited: Eli's reach never extends beyond the Comeau family group's data.

## Changes

1. **Remove the delegate dropdown entirely.**
   - Non-admins no longer see "Delegate view" / "Act on behalf of" on Daily & Final Input, Stay History, or the Departure Checklist.
   - The admin "View as" picker stays as-is for you (read-only observation mode, amber banner, Return to Admin).

2. **Permissions widen in place instead.** On each page, a member with the matching checkbox for their family group gets the same edit abilities the lead has *for that group only*:
   - **Daily & Final Input** (`canEditDailyFinal`): can view and fill in Daily/Final checkout for any stay in their family group, and save it — saves are recorded under the stay's host as normal.
   - **Stay History** (`canEditStayHistory`): sees the whole family's stays (like the lead does), can record payments/receipts and transfer credit within the family.
   - **Reservations** (`canEditReservations`): can create/edit/cancel reservations for their family group on the Calendar.
   - Members with boxes unchecked keep today's member-level view: only their own stays.

3. **Guardrails stay.** Server-side checks (the existing `user_has_delegate_permission` database function plus family-group scoping) enforce the same limits, so a crafted request can't touch another family group.

4. **Family Group Setup wording.** Update the checkbox helper text to say what it now means, e.g. "Allow this member to manage all stays in this family group (like the lead)" — so leads understand what they're granting.

## What this removes

- The whole "acting on behalf of" banner/mode for members, and the confusion you hit where viewing as Eli didn't show his dropdown. With no dropdown, there's nothing to simulate — viewing as Eli will simply show the page exactly as Eli sees it, with his lead-like editing powers visible.

## Technical notes

- `ViewAsUserPicker` becomes admin-only again (remove delegate path).
- `useDelegatePermissions` stays as the single source of the three flags per family group; pages call `forGroup(familyGroup)` and treat permitted members like leads for that group.
- `ImpersonationContext` delegate mode code is removed; admin view-as mode unchanged.
- Server enforcement reuses existing `user_has_delegate_permission` RPC; verify it matches the checkbox columns before relying on it (first implementation step).
