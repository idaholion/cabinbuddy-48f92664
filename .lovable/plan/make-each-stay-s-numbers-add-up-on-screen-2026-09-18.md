# Make each stay's numbers add up on screen

Today the math behind a stay is right, but the lines shown don't add up visually: the receipts line shows only the part used on that stay, and leftover credit appears on a separate line, so people can't follow it.

## What each stay will show

A simple top-to-bottom sum, where every line adds to the one below it:

```text
Previous Balance (Credit):              +$70.00
Charges (2 nights):                      $30.00
Payments (cash / check / venmo):          $0.00
Receipt Credits Submitted:             −$350.74
------------------------------------------------
New Balance (Credit):                  +$390.74
```

Rules:
- Previous Balance is the full balance carried in from the person's earlier activity.
- Payments shows everything paid toward that stay, in full.
- Receipt Credits shows the full amount of receipts submitted for that stay, with no receipt count in parentheses.
- New Balance = previous balance + charges + adjustment − payments − receipts. Always exact.

## Notes instead of extra lines

Anything about where the money went becomes small grey text under the related line, never its own number in the column:
- "Applied $30.00 to this stay, $320.74 available for later stays"
- "$X of these receipts covered an earlier stay"
- Carried-in credit notes stay as grey text, since that money is already inside Previous Balance.

The standalone "Receipt Credit Available for Later Stays" line is removed so it can't be mistaken for a second credit.

Transferred credit keeps its own line only when a transfer was applied to that stay, and it continues to reconcile as its own entry in the timeline.

## Technical notes

- File: `src/pages/StayHistory.tsx`, right-hand financial summary of each stay card (around lines 2261-2373).
- Display-only change. The allocation logic in `calculateStayData` (oldest-credit-first ordering, pools, overflow) is untouched; `amountDue = previousBalance + currentBalance` already equals the displayed sum.
- Payments line uses `amountPaid`; receipts line uses `receiptsTotal`; `paidApplied`, `receiptsApplied`, `carriedIn*`, and `receiptsOverflow` drive only the grey explanatory notes.
- The year-boundary "Receipt credit carried into {year}" marker and the single-year opening-balance adjustment stay as they are.
- Sign convention preserved: credits green and positive, outgoing money negative.
