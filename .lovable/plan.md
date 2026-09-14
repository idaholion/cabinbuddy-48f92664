# Stay History: "Receipts Credited" shows amount actually applied to charges

## Goal
Change the Stay History summary card so **Receipts Credited** reflects only the portion of receipt credit that actually paid down charges — "Total Charges Paid via credit from Receipts" — instead of the full submitted value of all receipts. The overflow (receipt value beyond what was owed) is already visible as **Credit Remaining**.

## Why this is Phase 1 (no Phase 2 needed)
The page already computes a chronological running-balance ledger per family. The change is additional math inside that existing walk: per stay, `receiptsAppliedToCharges = min(receiptsTotal, amount still owed on that stay after payments and any prior credit)`. No schema change, no new table, no backfill.

## Changes

### `src/pages/StayHistory.tsx`
1. **Ledger walk** (the existing `reservationsWithBalance` computation): track, per stay, how much of that stay's attributed receipts actually offset remaining charges:
   - `owedBeforeReceipts = charges + manualAdjustment − amountPaid − priorCreditCarriedIn` (floored at 0)
   - `receiptsApplied = min(receiptsTotal, owedBeforeReceipts)`
   - The rest of the receipt flows into the running balance as credit (current behavior unchanged).
2. **Summary card** (~line 1030):
   - Value = sum of `receiptsApplied` across displayed stays.
   - Title stays "Receipts Credited"; add a small muted sub-label: "Charges paid via receipt credit".
3. **Per-stay payment details** (~line 1203): show the applied portion as "Receipts Credited" and, when a receipt overflowed into credit on that stay, show the overflow as part of the credit line so per-stay math still reconciles: Previous Balance + Charges − Payments − Receipts Credited − (overflow → credit) = New Balance. Keep the "Receipts Submitted" informational line (count + full value) as-is.
4. **Payment History dialog** (`PaymentHistoryDialog.tsx`): pass the applied amount as `receiptsCredited` so the dialog matches the summary.

## Out of scope
- No database changes. Historical receipts keep a single amount/date; attribution stays date-based (existing behavior).
- Phase 2 (`payment_transactions` table) remains deferred pending your review — unrelated to this change.

## Verification
- Build check passes.
- Spot-check a family whose receipts exceeded their charges: summary "Receipts Credited" + "Total Charges Paid" + "Credit Remaining" should reconcile against "Total Charges".
