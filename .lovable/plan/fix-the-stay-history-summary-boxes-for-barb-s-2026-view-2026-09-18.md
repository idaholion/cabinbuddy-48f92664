# Fix the Stay History summary boxes for Barb's 2026 view

## What you are seeing

With 2026 selected, the boxes disagree with each other:

- "Total Charges Paid-via Venmo, check, cash etc" shows $650, although nothing was paid during 2026.
- "Total Charges" and "Charges Still Unpaid" both show $1,210, as if the $650 never existed.

## What the numbers actually are

Confirmed from the records:

- No 2026 Woolf Family stay has any payment recorded against it. Every 2026 stay is still pending.
- The only money in play is from October 2025: $830 was paid against a $180 stay, leaving $650 of credit.
- The October 2025 stay also carries several duplicate charge rows for the same stay, which may be inflating charge figures.

So the $650 box is showing credit left over from last year being applied to this year's stays, while the unpaid box is showing the closing amount owed across the person's whole record, computed a different way. The two boxes are answering different questions, which is why they can't be added up.

The exact source of the $1,210 (which combination of the 2026 charge rows, including the duplicates) still needs to be confirmed before the fix lands.

## What will change

1. Confirm which charge rows feed the $1,210, including whether duplicate rows for the same stay are being counted twice. Fix any double counting found.
2. Make all the top boxes describe the selected year only, consistently: charges for stays in that year, money actually paid toward them, receipt credit used, and what is still unpaid at the end of that year.
3. Keep each person's money separate. One person's leftover credit will not silently reduce another person's unpaid amount.
4. Separate "paid" from "credit used". Money that arrived in an earlier year will no longer be counted in the "paid by Venmo, check, cash" box; it will appear as credit carried in and applied, with its own box and a short grey note saying where it came from.
5. The boxes will then add up: charges minus payments minus receipt credit minus credit carried in equals the unpaid figure.

## Technical notes

- All work is in `src/pages/StayHistory.tsx`.
- `totalPaid` currently sums `stayData.paidApplied`, which includes `carriedInPayment` from prior years. Split it: a year-scoped `totalPaid` from own payments only, plus a new `totalCreditApplied` for carried-in payment credit.
- `totalStillOwed` currently sums `Math.max(0, finalBalanceByHost)` over every host in `fullLedger`, ignoring both the year filter and the visible scope. Rewrite it to use each host's balance at their last stay within the selected year, restricted to hosts with a visible stay in that view; with "All years" selected it stays the closing balance.
- Keep the per-host ledger math untouched: credit still only moves forward in time and each stay still closes with its own balance.
- Audit the duplicate payment rows on reservation `bf976abd-23e4-4282-afd8-e4d8cf1af46f` and the 2026 rows for `5aa2f14b-02da-495c-988f-918e73b6c31c` (a pending and a deferred row for the same $80) and confirm the ledger picks one row per stay.
- Preserve the display-only sign convention: credits green and positive, outflows black and negative.
- No database changes.
