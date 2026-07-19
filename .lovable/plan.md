## Problem

On the Oct 14–17, 2025 Andrew Family card, the numbers don't visibly reconcile:

- Previous Balance: −$40
- Calculated Amount: $30
- Amount Paid: $0
- Credit Carried Forward: $40

There's no visible line showing that the $30 stay charge was already covered by $30 of June's overpayment, so the reader can't tell why a $30 charge with $0 paid results in a $40 credit rolling forward.

## Root cause (verified)

The cascade logic already tracks this:

- `stayData.creditFromEarlierPayment = 30` is set on the Oct 14 stay when June's overpayment is distributed forward.
- June's `currentBalance` is bumped from −$70 to −$40 (the $30 consumed), and `previousBalance` for Oct is recalculated to −$40.

The "Credit Applied from Earlier Payment" row in the UI (`StayHistory.tsx` line 1336) only renders when `stayData.previousBalance >= 0`. Oct 14's `previousBalance` is −$40, so the row is hidden — even though the field has a real $30 value that explains the missing math.

## Fix

Remove the `previousBalance >= 0` gate so the "Credit Applied from Earlier Payment" line renders whenever `creditFromEarlierPayment > 0`.

Oct 14 will then read:

```text
Previous Balance:                       −$40.00
Calculated Amount:                       $30.00
Credit Applied from Earlier Payment:    −$30.00
Amount Paid:                              $0.00
─────────────────────────────────────────────────
Credit Carried Forward:                  $40.00
```

Math ties out: −40 + 30 − 30 + 0 = −40.

## Files

- `src/pages/StayHistory.tsx` — drop the `stayData.previousBalance >= 0` condition on the "Credit Applied from Earlier Payment" row (~line 1336). No hook or cascade changes; the value already exists.

## Out of scope

- No changes to the cascade math itself; June's "Applied to next stay: $30 / Rolled forward: $40 / $70 total overpayment" display and the existing tie‑line explainer stay as they are.
