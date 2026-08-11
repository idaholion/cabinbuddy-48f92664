# Fix: Splitting costs with another person silently fails

## What's happening

Debbie's stay (Jul 24 – Aug 6, 2026) is recorded with 9 guests on most nights, and all of those guests are currently assigned to her. In the Split Guest Costs dialog, each day's numbers must add up exactly to the recorded guest count for that day. Because her own column already holds all 9, any number she types into Peter's column is immediately forced back to 0 by the dialog's clamping rule — it looks like the value won't "take", and the Create Split button then fails validation ("Each selected person must have at least some guest count assigned") or produces a zero split.

Confirmed from the data: her stay's payment record has no cost-split note, and there are no 2026 split records at all — the save never reaches the server.

A second, separate point worth knowing: Peter Poznanovich is a member of the *same* family group (Poznanovich Family) as Debbie. Even if the split saved, the resulting charge lands back on Poznanovich Family, so nothing would visibly change. Splits are designed to move cost to a *different* family group.

## What to change

1. **Auto-rebalance instead of silently clamping.** When a guest count is entered for a split participant, take those guests from the host's column for that day automatically (down to 0), rather than refusing the input. The daily total stays matched by construction.
2. **Show why an entry was capped.** If a requested number exceeds the day's recorded guests, cap at the day maximum and show a brief inline note on that row instead of silently reverting to 0.
3. **Make the day-total mismatch visible before submitting.** Keep the red "x / y" indicator, and disable the Create Split button while any day is mismatched, with a tooltip explaining which day is off.
4. **Warn on same-family splits.** When the selected person resolves to the same family group as the host, show a warning in the picker row ("same family group — this will not move the cost to another group") and let the user proceed only intentionally.
5. **Surface server failures.** Any error returned from the split save shows the actual message in the toast (already partly there) and is logged, so a failure is never silent.

## Technical notes

- `src/components/GuestCostSplitDialog.tsx` (used by the Daily & Final Input page): rework `handleGuestCountChange` so a participant's increase decrements `sourceDailyGuests` for that date; cap at `dailyBreakdown[date].guests`. Adjust `validateSplit` messaging and the footer button's `disabled` condition.
- `src/components/UnifiedOccupancyDialog.tsx` (Stay History): same rebalance logic in its `handleSplitGuestCountChange`, and remove the silent early `return` in `handleSplitCosts` when `sourceUserId` / `reservationId` are missing — show a toast instead.
- Same-family detection: compare each selected user's `actual_family_group` to `sourceFamilyGroup`.
- No database or edge-function changes; `create-split-payments` behavior stays as is.
