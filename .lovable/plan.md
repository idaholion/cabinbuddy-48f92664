
## What's actually happening (the explanation)

Two clarifications in one, since they're both about how Stay History labels credits.

### 1. The $30 vs $40 puzzle

Your Jun 24–Jul 2 stay was overpaid by **$70** ($390 paid − $320 billed), not $30. That $70 splits into two pieces as it cascades forward:

- **$30** — the exact amount needed to cover Oct 14–17. Stay History labels this as **"Credit to Later Stays: $30"** on the June card, because $30 was the portion consumed by a later stay charge.
- **$40** — the leftover after Oct is covered. That $40 rolls forward as a running credit and shows on the Oct card as **"Previous Balance: −$40"** (green) and as **"Credit Remaining: $40"** at the bottom of the Oct card.

$30 + $40 = $70 = the full overpayment. Both numbers are correct; the label "Credit to Later Stays" only counts what got *consumed by a subsequent charge in view*, not the leftover that keeps rolling forward. That's why the same $70 appears with two different labels on two different rows.

### 2. "Total Payment Made" mixes money and receipts

On your June 24 row specifically, the $390 is 100% cash/venmo/check — no receipts. Receipts today are applied only to the **newest** reservation per family group (currently Aug 14, 2026 for Andrew Family, which holds all $763.95 of work-weekend receipts). But the label "Total Payment Made" doesn't distinguish money from receipts, so on the newest card the two get silently blended. That's the real risk you're flagging.

## Proposed UI clarification (presentation only)

Small changes in `src/pages/StayHistory.tsx`. No billing logic, no cascade math, no DB migrations.

**A. Always break out money vs receipts on the right-hand summary**

Replace the current single "Amount Paid" line with two labeled rows whenever either is non-zero:

- `Payments (cash / check / venmo): $XXX.XX`
- `Receipts Credited: −$YYY.YY  (N receipts)`

Keep the existing "Receipts Submitted" detail block on the left column, but link the two visually by using the same green color and receipt count.

**B. Split the source-row overpayment into two lines**

On any card whose overpayment was larger than the next stay's charge, replace the single "Credit to Later Stays" row with:

- `Applied to next stay: −$30.00`
- `Rolled forward as credit: −$40.00`

Small footnote below: *"$70.00 total overpayment."*

**C. Tie the two rows together on the receiving card**

When Previous Balance is a credit *and* it fully covers this stay, add one explainer line under the bottom total:

*"$30.00 of the incoming credit covered this stay; $40.00 remains."*

**D. Rename the bottom label for mid-chain rows**

When a row shows a negative total AND there is at least one later stay in view for the same host, label it **"Credit Carried Forward"** instead of **"Credit Remaining"**. Reserve "Credit Remaining" for the newest stay per host, where the credit actually stops.

## Files touched

- `src/pages/StayHistory.tsx` — right-column financial summary block (~lines 1243–1330). Read `stayData.amountPaid`, `stayData.receiptsTotal`, `stayData.receiptsCount`, `stayData.creditDistributedToLaters`, `stayData.creditFromEarlierPayment`, `stayData.previousBalance`, `stayData.amountDue`, and `lastReservationByHost` (already computed) to decide the split-vs-carry-forward wording.

## What's NOT changing

- No changes to `calculateStayData`, the forward cascade, or `applyBackwardPaymentCascade`.
- No changes to `useCheckoutBilling` or the Daily/Final checkout pages.
- No changes to receipt-attachment rules (receipts still land on the newest reservation per group).
- No schema or migration changes.

Ready to implement when you approve.
