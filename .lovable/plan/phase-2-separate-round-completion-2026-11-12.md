# Phase 2: separate round completion

## Result
Give each family separate Round 1 and Round 2 completion records. Completing one round must never be mistaken for completing the other, and booking the allowed weeks must never substitute for pressing “I'm done selecting.”

## Safeguards
- Preserve every reservation, rotation order, usage count, completed turn, and the saved November 19 opening.
- Keep post-rotation selection unlimited.
- Do not restart either finished season or resend notices.
- Supply any schema changes as SQL for Richard to run manually in the external Supabase SQL Editor.

## Work order
1. Inventory completion readers and writers across booking checks, banners, handoffs, notification checks, and usage reconciliation.
2. Write additive SQL with separate per-family completion values for each round, retaining existing fields during transition. Backfill only from explicit saved completion and authoritative round progression—not reservation counts. Verify both 2026 and 2027 remain finished, including Debbie's completed turn with zero second-round bookings.
3. After Richard applies the SQL, update the shared completion checks and explicit Done handoffs. Reconciliation may refresh counts but must not infer or reset completion. Keep handoff updates atomic and guarded against stale or repeated requests.
4. Run focused tests for independent rounds, explicit Done with zero picks, exhausted picks without Done, repeat handoffs, wrong-year reads, and finished-season preservation. Compare live read-only snapshots before and after; verify signed-in behavior where access is available.

## Technical details
- Use existing organization-scoped secure query wrappers for client database access.
- Use additive fields or records with a compatibility transition; never remove legacy state until all consumers have been checked.
- Preserve the current round's authoritative active-family pointers while persisting individual completion.
- Audit database triggers and scheduled functions as well as client code before switching completion reads.
- Keep annual pre-flight setup and annual reminders as subsequent work, not part of this change.

## Limitations
Authenticated end-to-end checks are not available through the project's external Supabase connection; Richard will need to confirm the signed-in calendar after the change. SQL application remains a manual checkpoint before the new completion paths are enabled.