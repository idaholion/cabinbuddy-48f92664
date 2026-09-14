# Make "View as" show exactly what that person sees

## What's happening today

You are right: on Stay History the selection changes almost nothing. Confirmed in the code:

- Stay History decides what to show with your real admin role, which short-circuits every permission check, so all families' stays stay visible.
- The family-group filter stays on "All Family Groups", and all admin-only controls (Admin Tools, Sync Payments, Link Orphaned Payments, per-stay editing, delete) remain on screen.
- The credit/ledger identity still uses your own login email, so a credit card shows your credit, not Tina's.
- Only the person-specific data lookups (which stays belong to whom) honor the selection — which is why the Daily & Final Input page does react, and this page mostly doesn't.

## What will change

While a person is selected, the app treats you as that person everywhere it decides what to show:

1. **Stay History** locks to the selected person: only their stays, their family group, their credit and balance. The family-group selector, Admin Tools, Sync Payments, Link Orphaned Payments, per-stay editing/deleting, and the admin-only "Credit Available to Transfer" card are hidden. Transfer Credit behaves as it would for them (their own credit only).
2. **Departure Checklist** and **Calendar** follow the same rule: their checklist, their group's booking rights, no admin editing while impersonating.
3. **Daily & Final Input** keeps its current person-scoping and additionally hides admin-only controls, for consistency.
4. A persistent banner stays on screen: "Viewing as Tina Comeau — you are seeing exactly what she sees", with a one-click **Return to Admin** button.
5. The picker's "Myself" option is renamed **Admin (myself)** — agreed, "Myself" reads as a filter rather than a mode. The picker label also changes from "Admin view" to **View as**, and the trigger reads "Admin (myself)" when nothing is selected, so the current mode is obvious at a glance.

## Suggestions worth adding

- Make the banner visually unmistakable (amber bar, full width, sticky at the top) so you never act on someone else's screen by accident.
- Keep read-only safety: while impersonating, any save/submit action is blocked with "Return to Admin to make changes" rather than silently writing as them. This avoids records attributed to the wrong person.
- Clear the selection automatically on sign-out and when switching organizations.

## Technical notes

- Add an `isImpersonating`-aware effective role: a small hook (e.g. `useEffectiveRole`) wrapping `useUserRole`/`useOrgAdmin` that returns non-admin role flags and the target's family group when `ImpersonationContext.isImpersonating` is true. Pages consume that instead of `useOrgAdmin().isAdmin` for display decisions.
- `ViewAsUserPicker` itself and the banner keep using the real `isAdmin` so the exit path never disappears.
- StayHistory: derive `currentUserLedgerKey`, `leadGroupName`, and the family-group filter from the effective identity; force `selectedFamilyGroup` to the target's group and hide the selector while impersonating.
- CheckoutList / CheckoutFinal / CabinCalendar: swap admin-gated UI onto the effective role; CabinCalendar's existing `impersonatedFamilyGroup` path is folded into the same context.
- Write-blocking: a shared guard helper used by save handlers on these pages.
