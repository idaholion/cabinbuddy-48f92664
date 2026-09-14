# Credit transfers between family members

## Goal

Let any adult member move **their own** credit (from overpayment or receipt overflow) to another family member — e.g. a Comeau child transferring their credit to Tina Comeau. Admins/treasurers can also transfer on anyone's behalf.

## Why a new record, not an edit

Credits are not stored anywhere — Stay History derives each person's credit from their own payments and receipts (per-person ledger). So a transfer must be recorded as data the ledger understands. Editing the original receipt/payment would falsify the audit trail; a fake "negative receipt" would inflate receipt totals and counts.

## What we build

1. **New `credit_transfers` table** (SQL script for you to run in the Supabase SQL Editor, per project convention):
   - `id`, `organization_id`, `from_ledger_name` (person the credit leaves), `to_ledger_name` (person receiving it), `amount`, `transfer_date`, `notes`, `created_by_user_id`, timestamps.
   - RLS: org members can read their org's rows. Inserts allowed when **either** the caller is the credit-holder (matched by claimed profile / email against `from_ledger_name`) **or** the caller is an admin/treasurer (uses the existing `is_org_admin_for` helper). Standard grants to `authenticated`/`service_role`.
2. **Transfer dialog on Stay History**:
   - A "Transfer Credit" button appears when viewing a person with credit remaining.
   - If you're the credit-holder (or an admin/treasurer), you can initiate it: pick the recipient (family group members / org members), amount (capped at the current credit), and a note. Shows both balances before/after.
   - Non-admins only ever see their own credit as the source; admins can pick any person with credit.
3. **Ledger integration** in `src/pages/StayHistory.tsx`:
   - Outgoing transfers drain the source person's credit pool (payment bucket first, then receipt bucket, so source tagging stays accurate).
   - Incoming transfers feed the recipient's pool; a stay paid from transferred credit shows a note like "includes $50.00 credit transferred from [name]".
   - Summary cards unchanged in structure: the source's Credit Remaining drops, the recipient's rises. Transfers net to zero across the organization, so the All Family Groups view stays consistent.
4. **Visibility**: transfers appear in the stay history detail with date, amount, both names, and the note — so everyone in the family group can see where credit went.

## Out of scope

- No changes to `payments` or `receipts` rows.
- Phase 2 (`payment_transactions`) remains deferred, unaffected.

## Technical notes

- New hook `useCreditTransfers.ts` (secureSelect/secureInsert wrappers, org context).
- Ledger key for transfer endpoints matches the existing per-person key (normalized name/email) so it lands on the right chain.
- Backward overflow pass and snapshot system untouched; snapshots will include transfers once the table exists (add to snapshot capture).
- Verify with `tail /tmp/observability/build-errors.log`; spot-check with a test transfer on the Andrew org.
