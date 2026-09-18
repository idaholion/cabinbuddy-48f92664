# Clarify receipt credit carried between years

## Goal
Make Stay History show the **unused receipt credit that actually crosses a year boundary**, rather than repeating the original receipt total or mixing balances from several people.

For Holly's example:

- The 2025 ledger ends with a single marker: **Receipt credit carried into 2026: $240.00**.
- The 2026-only view begins with the same marker: **Receipt credit carried into 2026: $240.00**.
- The June 5 stay then shows only what happened on that stay: its opening balance, charges, payments, receipt credit used, and resulting balance.

## What will change

1. **Replace the confusing rollover display with a year-boundary marker.**
   - In **All Years**, place it between the last 2025 stay and the first 2026 stay.
   - In a single-year view such as **2026**, place it before the oldest displayed stay so the opening credit is clear.

2. **Show the net amount that survived the prior year.**
   - Start with receipt credit created in earlier years.
   - Subtract any portion already used against earlier charges.
   - Show only the remaining receipt-sourced credit entering the selected year — $240 in Holly's case, not the original $449.12 receipt amount.

3. **Keep rollover separate from stay activity.**
   - Remove the misleading “Receipt Credit Carried Forward” line from an individual stay when it is really describing a year-to-year balance.
   - Keep “Receipts Credited” on each stay limited to receipt credit actually applied to that stay.
   - Preserve any genuine same-year overflow information without presenting it as the year-opening amount.

4. **Scope the marker to the person being viewed.**
   - Calculate it separately for each person's ledger.
   - Never total unrelated members or family groups into Holly's rollover figure.
   - Admin All Family Groups remains an aggregate overview, but person-level rollover labels will stay attached to the correct person's ledger.

## Confirmed code issue

The existing year-end divider in `src/pages/StayHistory.tsx` sums running balances across all visible ledger owners. It also detects year boundaries from the reversed display list in the wrong direction. That makes the divider unsuitable for explaining one person's receipt credit and can associate the wrong year or aggregate amount with a stay.

## Technical approach

- Track source-tagged pool snapshots by ledger owner at each calendar-year boundary: payment credit, receipt credit, and transferred credit remain separate.
- Derive the receipt rollover from the pool remaining after all activity in the prior year, including later receipts applied backward to earlier unpaid charges.
- Replace the current aggregate `yearEndBalances` rendering with person-scoped boundary data.
- Render the boundary in both All Years and single-year views, including when no stay exists exactly at year-end.
- Do not change receipts, payments, or stored financial records; this is a ledger calculation and presentation correction.

## Verification

- Holly's 2025/2026 boundary shows **Receipt credit carried into 2026: $240.00**.
- The 2026-only view shows the same $240 opening receipt credit.
- The June 5, 2026 stay no longer implies that $449.12 was newly carried into or created during that stay.
- All Years, 2025-only, and 2026-only views reconcile to the same final balance.
- Viewing another person never includes Holly's rollover amount.
- Existing payment credit and transferred credit remain source-attributed and are not relabeled as receipt credit.
