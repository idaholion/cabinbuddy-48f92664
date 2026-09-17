# Show a personal credit balance for people with no stays

## The problem

Today a person's credit is worked out from their stays: the page walks their
reservations in order and whatever is left over at the end is their credit.
Sam has no reservations, so there is nothing to walk — the $1 you transferred
to him has nowhere to show up. The same would happen if he turned in a receipt.

## Answers to your two questions

**"Each individual should see their own balance."** That is exactly what the
page already does for people who have stays — every person is tracked
separately, not lumped into one family total. The only gap is people with no
stays. So this is a small fix, not a new accounting system.

**The one real complication** is receipts. A receipt is recorded against a
family group, not against the person who turned it in, so today it reduces
whatever the family owes next. Changing that for everyone would move money
around on existing statements. The safe version: a receipt from someone who has
no stays of their own becomes *their* credit. Everyone else's receipts keep
behaving exactly as they do now, so no existing number changes.

**The lead toggle you described already exists.** On Stay History a group lead
sees a *My stays / Whole family* switch. Leads keep seeing their family's
figures because they are responsible for the group's billing; each adult still
sees their own separate balance rather than a family blob.

## What gets built

1. **A personal credit balance for people with no stays.** Their balance is:
   credit transferred in, minus credit they transferred out, minus anything
   already applied to a stay, plus receipts they submitted (only for people with
   no stays of their own).

2. **A credit card at the top of Stay History that shows even with no stays.**
   Instead of today's blank page, Sam sees "Credit Balance $1.00", the list of
   transfers in and out, and any receipts he turned in — plus the existing
   **Transfer Credit** button so he can pass it on.

3. **The same balance on the Daily & Final Input page.** That page already has a
   credit box ("apply to future stays / request a Venmo refund"); it currently
   only appears when the stay's own numbers produce a credit. It will also show
   a standing credit balance carried from transfers or receipts, so a person
   sees the same figure in both places.

4. **The balance is used, not just displayed.** When Sam does book a stay, his
   standing credit is applied to that stay first, and the stay shows a note
   saying where it came from (for example "includes $1.00 transferred from
   Richard Andrew").

## Technical notes

- `src/pages/StayHistory.tsx`: the ledger is keyed on `lastReservationByHost`,
  so hosts with zero reservations never enter `hostCreditMap`. Add a standing
  balance pass that seeds each ledger key from `credit_transfers` (in minus out)
  and from `receipts` whose submitter has no stays, then merge it into
  `hostCreditMap`, `currentBalance` and the opening pool of that host's first
  stay so it is consumed rather than double-counted.
- The `!allReservations.length` early return renders a stripped page; give it
  the credit card, transfer list and Transfer Credit dialog.
- Receipt attribution lives in the `receiptsByReservation` walk, which is keyed
  by `family_group`. Exclude receipts whose `user_id` maps to a person with no
  stays before that walk, so family attribution for everyone else is untouched.
- `src/pages/CheckoutFinal.tsx`: reuse the same standing-balance helper for the
  credit-options box and the `TransferCreditDialog` available amount.
- Pull the balance maths into a shared helper so both pages agree.
