# Make Stay History signs match how families read money

## Goal
Use signs to communicate direction instead of the internal accounting convention:

- **Green credit balances:** show as positive amounts, such as **+$946.28**.
- **Black amounts used or sent out:** show as negative amounts, such as **−$1.00** or **−$200.00**.
- **Money owed:** keep clearly labeled as a balance owed and retain the existing warning color, without presenting green credit as negative.

## Changes
1. Update each stay’s financial summary so opening, carried-forward, new, and current credit balances are green positive values.
2. Keep payments and credits applied against charges as black negative values because they reduce the stay cost.
3. Update transfer entries to read as a simple cash-style ledger:
   - previous available credit: green positive;
   - transfer sent: black negative;
   - transfer received: green positive;
   - resulting available credit: green positive.
4. Apply the same convention to year-boundary credit, credit held without a stay, and summary credit values.
5. Preserve all calculations and stored values; this is a display-only change.

## Verification
- Confirm Richard’s sequence reads **+$946.28**, **−$1.00**, **+$945.28**.
- Confirm the June 5 stay begins and ends with **+$240.00** credit.
- Confirm ordinary payments remain negative and unpaid balances remain visually distinct from credits.
- Check both All Years and single-year views, plus desktop and mobile layouts.

## Technical details
Centralize the display formatting around the amount’s business meaning—credit available, payment/outflow, or amount owed—rather than exposing the ledger’s internal negative-credit representation. No database or calculation changes are required.
