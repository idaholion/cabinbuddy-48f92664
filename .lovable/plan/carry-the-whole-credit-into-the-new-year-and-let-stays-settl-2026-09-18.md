# Carry the whole credit into the new year, and let stays settle in date order

Two fixes, and I agree with your instinct on the second one.

## 1. The year marker should show all credit carried forward

Right now the "Receipt credit carried into 2026" line only counts credit that came from receipts, so it shows $350.74 and quietly leaves out the $40 of leftover payment credit.

Change: the marker shows the person's whole ending credit from the prior year — $390.74 — and is relabeled "Credit carried into 2026". That same number becomes the Previous Balance on the first stay of the new year, so the two always agree.

## 2. Stays settle in date order, no reaching backwards

Today, receipts submitted with the Aug 14 stay are quietly pulled back to cover the last $9.26 of Jun 23, so Jun 23 looks settled with no visible source. Your suggestion is the right one:

- Jun 23 ends with New Balance: $9.26 owed.
- Aug 14 opens with Previous Balance: $9.26, and its own receipts clear it there, where you can see them.

Every stay then reads straight down the page and each balance feeds the next one, with no money moving backwards in time.

## What stays the same

- Credits green and positive, money out negative.
- Charges, payments, and receipt totals themselves are unchanged — only where credit is shown to land.
- No database changes; recorded payments and receipts are untouched.

## Technical notes

- File: `src/pages/StayHistory.tsx`.
- Remove the backward-credit pass (around lines 1104-1149) that moves a later stay's `receiptsOverflow` onto an earlier stay's `unpaidRemaining`, along with the `backwardCreditIn` / `backwardCreditOut` adjustments and the rebalancing loop that follows. Forward carry-forward pools (`pool.payment`, `pool.receipt`, transfer queue) stay as they are.
- Rebuild `receiptCarryIntoYear` (around lines 1316-1355) from the per-host running balance at the last stay of the prior year (credit only, i.e. negative `amountDue` shown positive) instead of the receipt-tagged pool.
- Update the two marker labels (around lines 2168 and 2645) to "Credit carried into {year}".
- Adjust `receiptCreditMovedToOpeningBalance` / `displayedPreviousBalance` (around lines 2143-2159) so the first visible stay of a year opens at exactly the marker amount and its displayed lines still sum to its new balance.
- Remaining references to `backwardCreditOut` in the netOverflow calculations get simplified accordingly.
