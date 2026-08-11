# Make the $10 credit appear in Stay History

## What the data shows

You are right that the credit is Debbie's. Here is where it came from:

- Barb Woolf's Oct 6–11, 2025 stay was **cost-split** with Debbie (a `payment_splits` record, 1 guest x 4 nights at $10/night).
- That split created a separate payment tagged **Poznanovich Family**: billed $40, paid $50 → **-$10 (credit)**, flagged "apply to future reservations".

So it is Debbie's credit, from her share of that Oct 2025 stay. My earlier "Woolf Family" comment was because the split payment still points at Barb's reservation record — that is the underlying reservation, not a claim that the credit is Barb's.

## Why Daily & Final shows it but Stay History does not

The two pages identify "whose ledger this is" differently:

- **Daily & Final Input** looks up credits by **family group** on the payment → finds Poznanovich → applies -$10.
- **Stay History** builds its running balance per **host key**, and that key is computed inconsistently:
  - a real reservation keys off the host's **email** from `host_assignments` (`poznand@yahoo.com` for Debbie's 2026 stay);
  - a split stay keys off the recipient's **user ID** (`906a6847-...` for Debbie).

Because an email and a UUID never match, Debbie's split stays sit in a separate ledger chain from her regular stays, and the -$10 never carries forward into 2026.

## The fix

Give the Stay History ledger a single, consistent identity per person/family so split stays and regular stays share one running balance.

Approach: key the running balance by **family group** (normalized, lower-cased), falling back to the current host key only when a stay has no family group. Family group is the field the payments themselves carry and the field Daily & Final already uses, so both pages will then agree by construction.

Result for Debbie:
- Oct 6–11, 2025 (split from Barb's stay): charges $40, paid $50 → new balance -$10 credit.
- Year-end 2025: -$10 credit rolled forward.
- Jul 24 – Aug 7, 2026: previous balance -$10, charges $1,170 → balance due $1,160 — matching the Daily & Final page exactly.

## Technical detail

In `src/pages/StayHistory.tsx`:

- Replace `getPrimaryHostKey` with a `getLedgerKey` that returns `reservation.family_group` normalized to lower case, falling back to the existing host-email / user-id logic when `family_group` is missing.
- Use that key for the `hostBalances` map in the chronological ledger walk, for the "newest stay per host" detection, and for the current-balance rollup, so all three stay in sync.
- No changes to the payment records or the split data — this is display/ledger-grouping logic only.

## Not included

- The duplicate $1,170 payment rows on the 2026 reservation (deferred earlier at your request).
- No database edits; the split and payment records stay exactly as they are.
