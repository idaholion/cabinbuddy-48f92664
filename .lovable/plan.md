# Plan: Fix Stay History Sync/Export visibility and behavior

## Current state

- On Stay History, some buttons are admin-guarded but **Sync Data** is shown to everyone.
- **Export** is shown to everyone but is wired to empty data, so the dialog renders nothing and the button does nothing.
- The existing export dialog already supports CSV with optional Billing, Payment and Occupancy columns plus a totals row.

## Decisions

- **Sync Data**: admin only (joins Sync Payments and Link Orphaned Payments).
- **Export**: available to everyone. It exports exactly what the person can see on the page — a member gets their own family's stays, an admin on "All Family Groups" gets every family.
- While viewing as another person, the page follows that person's permissions, so Sync disappears and Export covers only their data.

## What will be exported

A CSV file named `season_<year>_summary_<date>.csv`, one row per stay currently listed, with a totals row at the bottom:

- Family Group
- Check-In Date, Check-Out Date
- Nights
- Status
- Base Charge, Total Charges (Billing option)
- Amount Paid, Balance Due, Payment Status (Payments option)
- Average Occupancy (Occupancy option)

The dialog keeps its three checkboxes so the person can leave out billing, payment or occupancy columns. The Excel (.xlsx) choice stays disabled and labelled "Coming Soon".

## Technical details

1. `src/pages/StayHistory.tsx`
   - Move the **Sync Data** button inside the existing `isAdmin` guard.
   - Build a `seasonData` object from the already-filtered stay list passed to the dialog:
     ```text
     config: { startDate, endDate } derived from the selected year (or full range for "All Years")
     stays:  filtered/displayed stays, each with reservation, billing, payment
     totals: totalNights, totalCharged, totalPaid, outstandingBalance, actualGuestsAvg
     ```
   - Pass that instead of `null`, along with the selected year.
2. `src/components/ExportSeasonDataDialog.tsx`
   - Keep `generateCSV` as is; adjust the header/filename to handle the "All Years" case and use the passed `year` consistently (it currently reads `seasonYear` in two places).

## Verification

- Build passes.
- Admin sees Sync Data, Sync Payments and Export; a member sees only Export.
- Clicking Export downloads a CSV whose rows match the stays on screen and whose totals match the summary cards.