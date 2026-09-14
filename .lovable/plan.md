# Who can transfer credit

Short answer today:
- **Family Admin: yes.** An org admin already sees a "From" list of every member who has credit and can move it to anyone.
- **Group lead: no.** A lead who isn't an admin can currently only move their own credit, so Tina can't move Mallory's.

This plan adds the group-lead case, controlled by an admin switch.

## What changes

0. **Admin switch: "Allow group leads to transfer credit for their members."**
   A new on/off setting in Admin tools (organization settings), off by default. Admins always keep full transfer rights regardless of the switch. When off, leads can only move their own credit — exactly today's behaviour.

1. **Group leads can transfer for their own group (when the switch is on).**
   When the signed-in person is the lead of a family group, the Transfer Credit dialog's "From" list shows every member of *their group* who has credit (including themselves), instead of only themselves. Members of other groups are not listed.

2. **Recipient list.**
   A lead can send to any member in the organization, same as an admin — transfers between groups are already supported and net to zero in the ledger.

3. **Button visibility.**
   On Stay History, the Transfer Credit button shows for a lead whenever anyone in their group has credit — in the Credit Remaining card and in a stay's credit-options block for stays belonging to their group members.

4. **Record who did it.**
   Every transfer already stores the person who created it, so a lead- or admin-made transfer on someone else's behalf stays traceable. The transfer list entry will read "on behalf of" when the creator isn't the source member.

5. **Confirmation step for transfers on someone else's behalf.**
   When a lead or admin moves credit that isn't their own, the dialog asks for a short confirmation naming both members and the amount, to avoid accidental moves.

## Technical notes

- Lead detection reuses the existing `is_family_group_lead` / unified lead model (member 1 of the group); no schema change.
- `TransferCreditDialog` gains a permission scope prop (`own` | `group` | `all`) plus the lead's group name; `sourceOptions` filters `creditBySource` by that scope.
- `StayHistory.tsx` computes the viewer's lead status once and passes the scope; per-stay button condition becomes `isAdmin || isOwnStay || (isLead && stayHostInLeadGroup)`.
- Database: add an RLS insert policy allowing a family group lead to insert a transfer whose `from_ledger_name` resolves to a member of their group, so the client rule is enforced server-side too (current insert policy only covers self and admins). This is an external Supabase project, so the SQL will be provided to run in the SQL Editor.
- `CheckoutFinal.tsx` keeps its existing behaviour (self or admin); no lead-specific list there since that page is scoped to one person's stay.
