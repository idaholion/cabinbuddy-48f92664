# Fix "All Years" selection on Stay History

## Problem

Selecting "All Years" in the Stay History year filter immediately snaps back to 2026.

## Cause

"All Years" is represented by the value `0`. A fallback effect on the page watches the selected year and, whenever the selected year is not one of the years that actually have stays, resets it to the most recent year with data. Since `0` is never a real year in that list, choosing "All Years" is instantly overwritten with 2026.

That fallback exists for a good reason — it handles the case where the page defaults to the current year but the member has no stays this year — so it should be narrowed, not deleted.

## Fix

1. Make the fallback ignore the "All Years" value, so an explicit "All Years" choice is left alone.
2. Only run the fallback once, on initial load, rather than on every change. After the user has actively picked a year, their choice stands even if that year has no stays (they'll see the existing "No stays found for {year}" message, which is the expected behavior).

## Verification

- Load the page: still defaults to the current year, and still falls back to the most recent year with data when the current year is empty.
- Select "All Years": stays on "All Years" and lists stays from every year in one chronological ledger.
- Select 2025, then 2026, then "All Years" in sequence: each selection sticks.

## Technical detail

Single file: `src/pages/StayHistory.tsx`, the `useEffect` at lines 87-91. Add a `selectedYear !== 0` condition and gate the effect behind a "has initialized" ref so it does not re-fire after the first resolution. No changes to data fetching — the downstream `selectedYear === 0 ? undefined : selectedYear` year filters already handle the all-years case correctly.
