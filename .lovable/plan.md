# Fix: credits should not be split between people on a shared stay

## What's happening

On the Daily & Final Input page, when a stay is split, the page divides every financial item by guest-nights — not just the stay charges. Receipts, previous credit, and previous balance are each multiplied by each person's percentage:

- Your card shows "Your share of receipts", "Your share of credit", "Your share of previous balance"
- The other person's card shows the mirrored "Their share of ..." lines

So Debbie's $10 credit (earned by her family's earlier overpayment) is being handed 50/50-ish to Peter. That is wrong: charges are shared, money already paid is not.

## What to change

1. **Split charges only.** Guest-night proportioning applies to base rate, cleaning fee, pet fee, tax, and damage deposit — nothing else.
2. **Keep receipts, credits, and previous balance with their owner.** The source person's card keeps 100% of their own receipts, previous credit, and previous balance. Each split participant's card shows only their own charges, plus their own receipts/credit/balance if any exist for them.
3. **Per-person credit lookup for participants.** For each split participant, pull their own receipts (by their user id, within the stay dates) and their own outstanding credit/balance rather than borrowing the host's. If none is found, the participant's card shows charges only — no credit line at all.
4. **Relabel the lines.** Drop "share of" from receipts / credit / previous balance rows; they read "Less: Receipts submitted", "Less: Previous credit applied", "Previous Balance / Previous Credit" exactly like the non-split view. "Share" language stays only on the charge rows.
5. **Deferred payments follow the same math.** The "I'll Pay by End of Season" amount recorded for each person uses their own charges minus their own credits, so nothing carries the other person's money into their record.

## Result for Debbie's July 24, 2026 stay

Debbie: her charge share − her receipts − her $10 credit. Peter: his charge share only, no $10 line.

## Technical notes

- `src/pages/CheckoutFinal.tsx`, split-mode breakdown block (~lines 1543–1830): remove `sourceReceiptsShare` / `sourceCreditShare` / `sourceBalanceShare` proration and the matching `userReceiptsShare` / `userCreditShare` / `userBalanceShare`; source uses full `checkoutData.receiptsTotal`, `previousCredit`, `previousBalance`.
- Add a small per-participant credit resolver (receipts filtered by that participant's `user_id` and stay dates; payment credits looked up by their `user_id`, falling back to family group only when the participant is in a different family group than the host) so same-family participants don't inherit the host's credit.
- `createDeferredPaymentForUser` calls receive the corrected totals.
- No database, edge function, or Stay History changes; the ledger already keys off the payment records this page writes.
