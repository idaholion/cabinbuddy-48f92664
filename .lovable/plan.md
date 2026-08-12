# Carson Comeau: missing email and unclaimed profile

## What the data shows

Findings from the live database (Andrew Family Cabin, org `f888...9f`):

- In the Comeau Family group, both **Carson Comeau** and **Tim Comeau** currently have an empty `email` field. Everyone else in the org has an email.
- There is **no account** in auth for Carson (no user with a Comeau-related email other than Tina and Eli), and **no profile-claim record** for Carson has ever existed in `member_profile_links` — the org has 19 claim rows, none for Carson.
- The Comeau Family group row was last modified **2026-01-24 01:49:15 UTC**, at the exact same second as the Poznanovich group — the signature of a bulk/multi-group save rather than a single-member edit. Mallory Morrill's claim (2026-01-07) predates it; no Comeau claim exists after it.
- No entries exist in the safety/bulk audit tables for this org, so the change was not logged.
- Automated backups only retain the last few days (oldest: 2026-08-10), so Carson's previous email cannot be recovered from a backup.

## Most likely explanation

Carson had an email on the member record, which made the row appear "claimed/linked" in the Family Group view, but she never actually created an account or claimed a profile — a claim requires a `member_profile_links` row, and none was ever created for her. A save of the Comeau Family group on 2026-01-24 wrote back empty strings for Carson's and Tim's emails, clearing them. That is why the count of unclaimed members went from one to two.

Note: this is consistent with the same class of bug already fixed for the Woolf/Andrew alternate-lead fields, where an empty form value overwrote saved data on save.

## Proposed work

1. **Restore the contact data** — re-enter Carson's (and, if wanted, Tim's) email on the Comeau Family group. The value is not recoverable from the system, so it has to be supplied.
2. **Prevent recurrence** — in the Family Group Setup save path, skip writing an empty email/phone over an existing non-empty value for a member (same guard pattern used for alternate lead IDs), so a partial save can never blank out member contact info. Clearing a value stays possible through an explicit clear action.
3. **Make "claimed" unambiguous in the UI** — the Family Group Health Check / setup views should base the claimed indicator solely on an actual `member_profile_links` record, so a member with an email but no account is never shown as claimed.

## Technical notes

- Guard lives in `src/pages/FamilyGroupSetup.tsx` (member save/merge) plus the member validation in `src/lib/validations.ts`.
- Claimed-state display reads from `get_user_claimed_profile` / `member_profile_links`; the health-check page should not infer claim status from the presence of an email.
- No schema change required; the email restore is a data edit through the existing Family Group Setup page.
