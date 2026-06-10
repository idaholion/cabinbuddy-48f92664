# Simplify Checkout Balance Display

## Problem
The Daily and Final Input currently shows two confusing rows:
- "Previous Balance: $209.12"
- "Previous Credit Applied: -$449.12" (or similar)

…then a final number that can be negative but is still labeled like an amount due. Users have to mentally net the two rows to understand where they stand.

For the Cook family today:
- Previous payments balance: +$209.12 owed
- Receipts (credits): $449.12
- Net previous position: -$240.00 (i.e. $240 credit)
- This stay's charge: $80.00
- Final: -$160.00 → should read **"Credit Remaining: $160.00"**

## Changes

### 1. Collapse to a single "Previous Balance" line
In the checkout summary (Daily + Final Input pages), replace the two rows with one:

- Compute `netPrevious = previousBalanceDue − previousCredits` (payments balance minus receipts/credit-applied-to-future).
- Render one row:
  - If `netPrevious > 0` → "Previous Balance: $X.XX" (amount they still owe coming in)
  - If `netPrevious < 0` → "Previous Credit: −$X.XX" shown in a credit/positive color
  - If `netPrevious == 0` → omit the row entirely

### 2. Relabel the final total based on sign
The bottom-line figure currently always reads as "Total / Balance Due". Change to:

- `final >= 0` → "Balance Due: $X.XX"
- `final < 0`  → "Credit Remaining: $X.XX" (shown in success/green styling, no minus sign)

### 3. Keep the underlying math identical
No changes to `useCheckoutBilling` calculation logic — it already nets payments + receipts into `previousCredit`. This is purely a presentation change in `CheckoutList.tsx` and `CheckoutFinal.tsx` (and any shared summary component they use).

### 4. Defer/Pay button copy
When the final is a credit, the "Defer payment" / "Mark paid" actions don't make sense. Hide or disable them and instead show a short note: "No payment owed — $X.XX credit will carry forward."

## Files touched
- `src/pages/CheckoutList.tsx` — summary block
- `src/pages/CheckoutFinal.tsx` — summary block + action buttons
- (Possibly extract a small `CheckoutBalanceSummary` component if the markup is duplicated)

## Out of scope
- No changes to Stay History
- No changes to how credits are stored or computed
- No changes to billing math
