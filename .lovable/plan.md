# Show Eli's own "Act on behalf of" dropdown while viewing as Eli

## What's happening now

On Daily & Final Input the picker at the top is always built from **your own** account, not the person you're viewing as. So while you are viewing as Eli, you still see the admin picker ("View as", every member listed). Eli's own delegate dropdown is never simulated, which is why it looks like his permissions aren't working.

Eli's checkboxes themselves are fine — the page just never asks "what would Eli see here?".

## What will change

While an admin is viewing as someone:

- The picker recalculates permissions **as that person**. If Eli has Daily/Final permission in the Comeau group, the page shows his dropdown exactly as he'd get it: labelled **Act on behalf of**, listing only claimed members of his own family group.
- That simulated dropdown is read-only (you can open it and see the names, but selecting a person doesn't chain a second impersonation) — consistent with view-as being strictly look-don't-touch.
- If the person you're viewing as has no delegate permission for that page, no dropdown appears — which is the true picture of what they'd see.
- The amber "Viewing as …" banner and **Return to Admin** button stay exactly where they are, above the simulated dropdown, so you always have the exit.

Same behaviour on Stay History and the Departure Checklist, each using its own permission (Stay History, Reservations).

## Technical notes

- `useDelegatePermissions` gains an optional identity argument (email / user id) instead of always reading `useAuth()`; default behaviour unchanged.
- `ViewAsUserPicker` resolves its identity from `useImpersonation()`: in admin-view mode it passes the target's email/user id into `useDelegatePermissions` and drops admin privileges for the purpose of building the member list, so `delegateGroups` and `members` reflect the target.
- In that simulated state the `Select` renders `disabled`, with the real admin picker still reachable through the banner's **Return to Admin**.
- Delegate mode (a real member acting for someone) is untouched.
