# Stay History — attribute carried credit to its true source (payments vs receipts)

## Problem
In the ledger walk, when a stay's payments or receipts exceed its charges, the excess is carried forward as an unlabeled "credit". When a later stay spends it, the amount shows under "Charges Paid from Earlier Credit" — even in the All Years view, where the user expects every dollar to be attributed to Venmo/check/cash payments or to receipt credit. Example: $100 charges + $150 receipts on stay 1, $50 charges on stay 2 → today shows Receipts Credited $100 + Earlier Credit $50, instead of Receipts Credited $150.

## Fix: source-tagged credit pool
Rework the ledger in `src/pages/StayHistory.tsx` so carried-forward credit keeps its source:

1. Per-person pool becomes two buckets: leftover **payments** and leftover **receipts** (keyed by the existing ledger key).
2. For each stay, apply in order: this stay's payments, this stay's receipts, then pool funds — pool dollars count toward their tagged source (payment-tagged adds to that stay's `paidApplied`, receipt-tagged to `receiptsApplied`).
3. Overpayments add to the payment bucket; receipt overflow adds to the receipt bucket. The existing backward pass (later receipts settling earlier unpaid stays) is unchanged and tags as receipts.
4. `priorCreditApplied` becomes zero by construction in All Years; across a year filter, carried-in credit is likewise attributed to its original payment/receipt source, so the "Charges Paid from Earlier Credit" card is removed entirely.
5. Summary cards keep: Total Charges, Total Charges Paid via Venmo/check/cash, Receipts Credited, Charges Still Unpaid, Credit Remaining / Balance Due. Totals still reconcile: paid + receipts + unpaid = charges; Credit Remaining = unspent pool.
6. Per-stay rows: "Receipts Credited" / payment amounts now include carried-in funds of that source, with a small note "includes credit carried in" when applicable.

## Out of scope / unchanged
- No database changes; no changes to `payments`/`receipts` tables or hooks.
- `PaymentHistoryDialog` keeps working via the same props (values now source-attributed).
- The hidden "Credit Remaining" card behavior in the All Family Groups view stays as-is.

## Technical notes
- Touch points: `calculateStayData` (allocation math), the ledger walk (~lines 745–779), summary totals (~839–846), summary cards, per-stay detail rows.
- Verify with `tail /tmp/observability/build-errors.log`; spot-check Andrew Family ($450 charges = $390.74 receipts-carried + $59.26 receipts, nothing still due).
