# Fix: Pete's Stay History balance inherits Debbie's balance

## What's happening

Stay History builds each running balance using a ledger key, and that key is currently the **family group**. Debbie and Pete are both in "Poznanovich Family", so their stays land in one shared chain:

- Debbie's Jul 24 – Aug 7, 2026 stay: $270 charge, $10 credit → $260 carried forward
- Pete's split stay (the $900 guest-cost split created from that stay) then starts with Debbie's $260 as "previous balance"

Pete's card should start at $0 previous balance and show $900 due.

The family-group key was introduced earlier to fix a different problem: Debbie's split stays keyed off her user ID while her regular stays keyed off her host email, so her $10 credit never carried into 2026. Both problems need one identity per **person**, not per family.

## The fix

Key the ledger by **person identity**, resolved consistently for both kinds of stay:

1. Build a `userId → email` map for the organization from `member_profile_links` (claimed user id → member name) joined to `family_groups.host_members` (name → email). Both Debbie and Pete have claimed links, so this resolves cleanly.
2. `getLedgerKey` becomes:
   - virtual split stay → the recipient's email if resolvable from `split_to_user_id`, else that user id
   - regular reservation → the primary host's email from `host_assignments`
   - fall back to `user_id`, then family group, when neither resolves
   All keys normalized to lower case.
3. The same key is used in the three places that must agree: the running-balance walk, the "newest stay per person" detection, and the year-end / current-balance rollup.

## Result

- Pete's split stay: previous balance $0, charges $900, balance due $900.
- Debbie keeps a single chain: her Oct 2025 split (-$10 credit) rolls forward into her Jul 2026 stay, $270 − $10 = $260 — unchanged from today.

## Technical notes

- `src/pages/StayHistory.tsx` only. Replace the `family_group`-first `getLedgerKey` (around lines 655–670) with the identity-map version, and build the map from the family groups already loaded on the page plus a `member_profile_links` fetch scoped to the current organization.
- No database, payment, or split-record changes; this is ledger-grouping logic.
- The Daily & Final Input page already attributes credits per person, so the two pages stay in agreement.
