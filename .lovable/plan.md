# Show the applied credit on the Daily and Final cost breakdown

## The problem

On Debbie's July 24 – Aug 6 stay the breakdown reads: base rate $1,170, subtotal $1,170, receipts submitted $0, balance due $1,160. The missing $10 is real and correct, but invisible.

Her family has a payment from Nov 2, 2025 where the charge was $40 and $50 was paid, leaving a $10 credit flagged "apply to future reservations". The checkout total already subtracts that credit, but the breakdown never prints a line for it, so the subtotal-to-balance math doesn't add up on screen.

## The fix

Add an explicit credit line to the cost breakdown so the math reads top to bottom:

```text
Base rate                        $1,170.00
Subtotal                         $1,170.00
Less: Receipts submitted             $0.00
Less: Previous credit applied      −$10.00
─────────────────────────────────────────
Balance Due                      $1,160.00
```

Rules:
- The line only appears when an applied credit is greater than zero.
- Wording: "Less: Previous credit applied", green, with a minus sign, matching the existing receipts line.
- Add it in both places the breakdown renders: the shared breakdown block and the main summary card near the Balance Due row.
- Display only. No change to how the total is computed, so no risk of double-counting and no change to any saved amount.

## Technical notes

- `useCheckoutBilling.ts` already returns `previousCredit` and nets it into `total` (`total: result.total - previousCredit`). The page destructures `previousCredit` but never renders it.
- Edit `src/pages/CheckoutFinal.tsx` only: insert the new row next to the existing "Less: Receipts submitted" rows in the memoized breakdown block and in the enhanced billing summary card.
- The existing separate "Previous Balance / Previous Credit" row (driven by `previousBalance`) stays as is — it covers receipt-based and prior-stay balances, which are a different source than the payment credit.

## Not included

The duplicate $1,170 payment rows on this reservation (one `pending` full_payment, one `deferred` use_fee) are left alone for a later task.
