# Plan: Fix overlapping tabs on Notification Management page

## Problem
`src/pages/CalendarKeeperManagement.tsx` line 31 forces all 7 tabs into a single fixed row with `grid w-full grid-cols-7`. On narrower screens the long labels ("Manual Reminders", "Manual Notifications", "Reservation Lookup", "Automated System") can't shrink, so they overlap.

## Fix (scrollable row)
Replace the fixed 7-column grid with a horizontally scrollable, single-row tab bar:

1. Change the `TabsList` className from `grid w-full grid-cols-7` to a flex row that scrolls horizontally when content overflows:
   - `flex w-full overflow-x-auto` (base)
   - `sm:grid sm:grid-cols-7` so on larger screens it still spreads evenly across the full width (no scroll needed there)
   - Add `whitespace-nowrap` to each trigger (they already have it in the base component) and keep labels intact.
2. Add a thin scrollbar style so the scroll affordance is subtle: apply `scrollbar-thin` (or a small utility) to the list. Keep the existing shadcn rounded `bg-muted` look.
3. No changes to `TabsContent`, routing, or any tab logic — purely the list layout.

## Why this works
- On wide screens: `sm:grid-cols-7` distributes tabs evenly, identical to today.
- On narrow screens: the grid is dropped in favor of `overflow-x-auto`; tabs keep their natural width and the row scrolls horizontally instead of overlapping.
- Mobile users can swipe the tab bar; desktop users see the same full-width row as before.

## Files changed
- `src/pages/CalendarKeeperManagement.tsx` (one className change + optional scrollbar utility)

## Verification
- Resize the preview narrower than the tab bar's natural width and confirm tabs no longer overlap and the row scrolls.
- Confirm at full desktop width the 7 tabs still fill the row evenly.
