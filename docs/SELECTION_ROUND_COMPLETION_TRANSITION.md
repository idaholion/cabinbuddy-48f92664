# Separate round completion transition

## Checkpoint 1: additive SQL, not enabled in the calendar yet

`supabase/sql/2026-11-12_separate_round_completion.sql` adds nullable per-family primary and secondary completion fields to existing usage rows. It does not create a table or change grants/RLS. Existing policies continue to apply. The backfill is limited to the six saved rotation families in each reviewed Andrew organization season (2026/2027) and aborts unless both authoritative rounds remain finished. It preserves legacy usage data and repeat execution does not overwrite new completion values.

Debbie/Poznanovich has zero second-round bookings but explicitly finished; she must still be backfilled as completed. No booking-count inference is allowed.

## Inventory for checkpoint 2, after manual SQL confirmation

- `useSequentialSelection`: primary completion reads, Done write, next-family read, phase detection and family status.
- `useSecondarySelection`: fresh handoff must persist the outgoing family's secondary completion atomically with a guarded active-family advance. Current loop skips exhausted allocations; replace with explicit completion progression, excluding the outgoing family.
- `useTimePeriods`: reconciliation currently infers legacy completion from secondary bookings; remove completion inference and migrate its direct database calls through organization-scoped wrappers with Richard's approval of this discovered rule mismatch.
- `secondary-selection-transition`: read the primary field through `selection-round-completion`; initialization must never restart a started round.
- `useSelectionUsageDisplay`: carry separate fields through read-only usage snapshots, without marking completion from counts.
- `check-selection-turn-changes`: primary expiry advancement and reminders read/write primary completion; secondary active-pointer updates must also preserve individual completion. Distinguish expiry policy from explicit Done.
- `send-selection-turn-notification`: primary completion lookup changes; secondary uses saved current-round state, never primary Done.
- `UpcomingRemindersPreview`: primary completion filtering changes; its secondary filter uses the secondary status table's current turn flag, not per-family usage.
- `SelectionSeasonSetup` / `auto-create-selection-season`: initialize new seasons only, never rewrite active or finished seasons; set both completion fields false for genuinely new usage records.
- `NotificationManagement`: current secondary status check remains round-specific.
- Booking/edit validators use authoritative primary/secondary active pointers; preserve those checks during transition.

## Database audit

Existing usage triggers only default null legacy completion on insertion and maintain updated_at. The rotation trigger only maintains updated_at. No secondary-status trigger was found. `reset_selection_for_testing` is a legacy destructive testing function and must not be called or changed as part of this work. Existing policies allow organization-scoped usage/status management; do not widen them in this transition.

## Remaining validation

The pure shared completion reader has tests for independent rounds, zero-booking Done, exhausted picks without Done, wrong-year records, legacy compatibility, and missing records. SQL has not been executed by the agent. After Richard applies it, compare live reservation/state snapshots and run handoff/finished-season regression tests before enabling new consumers. Repeat/stale handoff tests belong to that implementation checkpoint. Authenticated UI verification is unavailable for the external Supabase connection.