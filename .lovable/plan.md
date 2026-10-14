# Make multi-week stays easy and count nights correctly

## 1. Show nights, not days
The calendar selection now shows "8 days selected" for a Friday-to-Friday week. Change it to show nights and dates, for example "7 nights · Fri Jul 16 – Fri Jul 23 (1 week)". Two weeks would read "14 nights (2 weeks)".

## 2. Tip on the selection bar
When a family still has 2 or more picks left, show a short line under the selection bar: "Need 2 weeks? Drag across both weeks to book them as one stay."

## 3. Offer to merge back-to-back stays
When someone books a stay that starts on, or one day after, the day their own earlier stay ends, show a choice before saving:
- **Combine into one stay** (recommended): extends the existing stay to the new end date, so there's no gap and no overlap.
- **Keep separate**: saves the new stay starting on the same changeover day as the earlier stay's Departure. It does not shift the start a day later.

A same-day changeover with your own stay is allowed. The Departure day of one stay is the arrival day of the next.

## 4. Gentle warning for a one-day gap
If a stay would leave a single empty night between the family's own stays, show: "This leaves 1 night unbooked between your stays. Combine them instead?"

## Not changing
- Selection order, the number of picks, and the counting fix already made (a 14-night stay counts as 2 picks).

## Technical details
- `PropertyCalendar.tsx`: label = nights (dates count minus 1) plus a date range and a week count.
- Booking flow (`BookingForm.tsx` / the calendar's create-from-selection): before inserting, look up the same family's reservations whose end_date is the new start date or the day before it. Show a merge dialog. Merging updates the existing reservation's end_date instead of inserting a new one, using the secure wrappers.
- No database changes.
