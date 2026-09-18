# Show credit transfers as separate ledger transactions

## Goal

Make each stay close with the balance created by that stay alone, then show later credit transfers as their own fully reconciled transactions.

For Richard’s example:

```text
Aug 14 stay
Receipt Credit Available for Later Stays   $946.28
New Balance (Credit)                       $946.28

Credit transfer
Previous Balance (Credit)                  $946.28
Transfer to Sam                              $1.00
Current Balance (Credit)                   $945.28
```

## What changes

1. **Stop folding post-stay transfers into the newest stay card.**
   - The Aug 14 stay’s ending balance remains $946.28 because that is the balance immediately after the stay.
   - Its label is **New Balance**, not **Current Balance**, whenever a later ledger transaction exists.

2. **Turn the Credit Transfers section into ledger entries.**
   - Each outgoing transfer shows previous balance, recipient and transfer amount, then the resulting balance.
   - Each incoming transfer shows previous balance, sender and transfer amount, then the resulting balance.
   - The newest transfer entry uses **Current Balance**; older entries use **New Balance**.
   - Keep the date, note, and “recorded by you on their behalf” detail.

3. **Calculate balances chronologically per person.**
   - Build one timeline from stays and transfers, ordered by date.
   - A stay changes the balance through charges, payments, and receipts.
   - An outgoing transfer reduces credit; an incoming transfer increases credit.
   - Multiple transfers chain from one balance to the next without changing historical stay results.

4. **Respect the current filters and permissions.**
   - Show only transfer entries relevant to the selected person/family scope.
   - Preserve the existing organization-wide admin view and transfer permissions.
   - Keep summary balances based on the latest full ledger, even when a year filter hides older entries.

## Possible difficulties and safeguards

- **Same-day ordering:** transfers only store a date, not a precise ledger time. Use creation time to order same-day transfers, with a stable ID fallback.
- **Transfers dated on a stay date:** define the stay as closing first and the transfer as occurring afterward, so its opening balance matches the stay’s ending balance.
- **Incoming credit later spent on a stay:** keep the existing source tracking so the later stay can still identify transferred credit applied to its charges.
- **Filtered years:** the first visible item may need an opening balance calculated from hidden prior years; calculation remains global and filtering remains display-only.
- **People with no stays:** retain their standing-credit display, while their transfer entries still reconcile from opening to current credit.

## Technical scope

- Update the Stay History ledger and transfer presentation in `src/pages/StayHistory.tsx`.
- No database changes and no edits to existing payment, receipt, or transfer records.
- Verify Richard’s $946.28 → $1.00 → $945.28 example, incoming transfers, multiple same-day transfers, year filtering, and no-stay credit holders.
