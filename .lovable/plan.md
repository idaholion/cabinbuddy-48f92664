# Plan: Fix Stay History Sync/Export visibility and behavior

## Current state

- On Stay History, `isAdmin` controls some buttons but **Sync Data** is shown to everyone.
- **Export** is shown to everyone but passes `seasonData={null}`, so the dialog renders nothing and does nothing.
- The existing `ExportSeasonDataDialog` supports CSV export with optional Billing, Payment and Occupancy columns plus a totals row.

## Goal

1. Hide admin-only actions (Sync Data, Sync Payments, Link Orphaned Payments) when the user is not an admin.
2. Make Export work — generate a real CSV from the stays currently visible on the page.
3. Decide and document who may export.

## Proposed implementation

### 1. Sync Data visibility ( StayHistory.tsx )

Move the **Sync Data** button inside the existing `{isAdmin && ...}` guard, alongside **Sync Payments** and **Link Orphaned Payments**.

### 2. Export behavior and permissions

Option A — Admin-only export (recommended if the CSV can contain other families' data).
Option B — Anyone can export the rows they currently see.

For either option, wire `ExportSeasonDataDialog` to real data by computing `seasonData` from the already-filtered `stays` array on StayHistory:

```text
config:   { startDate, endDate } from selectedYear (Jan 1 – Dec 31)
stays:    the displayed stays with reservation, billing, payment fields
totals:   totalNights, totalCharged, totalPaid, outstandingBalance, actualGuestsAvg
```

Use the dialog's existing `generateCSV` function. Export is either guarded by `isAdmin` (Option A) or always shown and exports only the visible filtered rows (Option B).

### 3. CSV contents

The exported file will be named `season_<year>_summary_<YYYY-MM-DD>.csv` and contain:

- Family Group
- Check-In / Check-Out Dates
- Nights
- Status
- Base Charge & Total Charges (if Billing selected)
- Amount Paid, Balance Due, Payment Status (if Payments selected)
- Average Occupancy (if Occupancy selected)
- A totals row at the bottom

### 4. Verification

- `bun run build` must pass.
- Manual preview check: admin sees Sync + Export; non-admin sees Export only (Option B) or neither (Option A).
- Click Export, confirm CSV download contains the expected rows.

## Open question

Should **Export** be available to regular members for their own visible stays, or restricted to admins?