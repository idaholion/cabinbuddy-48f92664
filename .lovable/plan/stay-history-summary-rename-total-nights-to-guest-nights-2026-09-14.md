# Stay History summary: rename “Total Nights” to “Guest Nights”

## Change
On the Stay History summary cards, rename **“Total Nights”** to **“Guest Nights”** and add a small sublabel that reads **“people × nights”** so the metric is immediately understood.

## Why
The current label implies calendar nights stayed at the cabin, but the number actually reflects total guest occupancy (guests × nights). “Guest Nights” is the standard hospitality term and avoids confusion.

## Files to change
- `src/pages/StayHistory.tsx` — update the summary card label and add the sublabel.

## Out of scope
- No database or calculation changes; the existing `totalNights` value (guests × nights) remains the source.
- No changes to other pages or per-stay detail rows.
