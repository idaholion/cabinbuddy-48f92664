# Credit transfers between family members

## Goal

Let an admin (or family group lead) move credit from one person's ledger to another person's — e.g. a Comeau child's credit (from overpayment or receipt overflow) transferred to Tina Comeau's account.

## Why a new record, not an edit

Credits are not stored anywhere — Stay History derives each person's credit from their own payments and receipts (per-person ledger). So a transfer must be recorded as data the ledger understands. Editing the original receipt/payment would falsify the audit trail; a fake "negative receipt" would inflate receipt totals and counts.

## What we build

1. **New `credit_transfers` table** (SQL script for you to run in the Supabase SQL Editor, per project convention):
   - `id`, `organization_id`, `from_ledger_name` (person the credit leaves), `to_ledger_name` (person receiving it), `amount`, `transfer_date`, `notes`, `created_by_user_id`, timestamps.
   - RLS: org members can read their org's rows; only admins/treasurers (and supervisors) can insert. Standard grants to `authenticated`/`service_role`.
2. **Transfer dialog on Stay History** (admin/treasurer only): "Transfer Credit" button → pick the source person (dropdown of people with credit remaining), the recipient (family group members), amount (capped at the source's current credit), and a note. Shows both balances before/after.
3. **Ledger integration** in `src/pages/StayHistory.tsx`:
   - Outgoing transfers drain the source person's credit pool (payment bucket first, then receipt bucket, so source tagging stays accurate).
   - Incoming transfers feed the recipient's pool, tagged so a stay paid from transferred credit shows a note like "includes $50.00 credit transferred from [name]".
   - Summary cards unchanged in structure: the source's Credit Remaining drops, the recipient's rises. Transfers net to zero across the organization, so the All Family Groups view stays consistent.
4. **Visibility**: transfers appear as entries in the Payment Details / stay history context with date, amount, both names, and the note — so anyone in the family group can see where credit went.

## Out of scope

- No changes to `payments` or `receipts` rows.
- Members cannot initiate transfers themselves — admin/treasurer only (matches how adjustments work today).
- Phase 2 (`payment_transactions`) remains deferred, unaffected.

## Technical notes

- New hook `useCreditTransfers.ts` (secureSelect/secureInsert wrappers, org context).
- Ledger key for transfer endpoints matches the existing per-person key (normalized name/email) so it lands on the right chain.
- Backward overflow pass and snapshot system untouched; snapshots will naturally include transfers once the table exists (add to snapshot capture).
- Verify with `tail /tmp/observability/build-errors.log`; spot-check with a test transfer on the Andrew org.
