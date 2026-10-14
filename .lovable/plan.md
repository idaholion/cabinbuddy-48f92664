# Selection counter: confirm the fix (no new code)

## Why it showed "0 of 2"
- The counter ignored every booking made during the main take-turns selection round, so both of Debbie's weeks were skipped.
- The 6-night stay would also have counted as 0 weeks, because short stays rounded down.

## Status
Both problems were fixed in the code before the stay was merged into one 2-week booking. The merge did not hide the problem:
- Two separate stays (7 and 6 nights) would now count as 1 + 1 = 2.
- One 14-night stay counts as 2.
- Stays that are a little short or long round to the nearest week, with a minimum of 1.

## Optional check
1. Create a test family's 6-night stay during selection and confirm it shows "1 of 2".
2. Add a second 7-night stay and confirm it shows "2 of 2".
3. Delete the test stays.

## Technical details
In the usage reconciliation, rotating-selection bookings made before secondary selection now count. Each stay counts as max(1, round(nights / 7)).
