# Stay History — clarify "Earlier Credit" wording

## Finding (no math change needed)
In the all-years view, "Charges Paid from Earlier Credit" is legitimate: it is credit **earned on an earlier stay within the shown range** (from receipt overflow or overpayment) and later applied to another stay. The ledger starts each person's balance at $0 on their oldest stay, so no credit enters from outside the data. The label just reads as if the credit predates the view.

## Change (UI text only, `src/pages/StayHistory.tsx`)
1. Rename the summary card from **"Charges Paid from Earlier Credit"** to **"Charges Paid with Carryover Credit"**.
2. Add a small sublabel beneath it: **"credit earned on earlier stays in this view"**.
3. Per-stay detail rows: where prior credit is applied, use the same "Carryover Credit" phrasing so card and rows match.
4. No changes to calculations, the ledger walk, or any other card.

## Technical notes
- Card renders around the summary totals in `StayHistory.tsx` (`totalPriorCreditApplied`), already conditional on a non-zero value.
- No database, hook, or dialog changes; `PaymentHistoryDialog` props untouched.
- Verify with `tail /tmp/observability/build-errors.log` after the edit.
