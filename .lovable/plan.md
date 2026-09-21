# Why the 2027 selection reminders aren't showing

Short answer: it is not the people who still have 2026 reservations. Nothing about 2026 bookings blocks the system from looking ahead.

Two separate things are stopping it:

1. **There is no 2027 selection schedule yet.** The stored selection turns only cover 2025 and 2026 (the 2026 turns ran from Aug 25 to Nov 8, 2025, and are all in the past). There is no saved list of who picks when for 2027, so there is nothing for the reminder system to announce. Today there is also no button anywhere in the app that creates next year's turn schedule — the capability exists in the code but was never wired to a screen.

2. **The reminder preview is still pointed at 2026.** The system decides which year to look at by checking whether today is on or after October 1. Today is September 21, so it answers "2026" and only looks at 2026 turns — all of which are finished. It will not switch to 2027 until October 1, the very day the first turn starts, so nothing shows in advance.

# What to change

## 1. Let the year roll over early enough to preview it

Change the selection-year rule so it looks ahead: once we are within 60 days of the start month (October 1), treat the upcoming year as the active selection year. From August 2 onward, the app would be working with 2027, so the Oct 1 turn shows up in the 30-day reminder preview and on Notification Management.

## 2. Add a way to create next year's selection schedule

On Reservation Setup, add a "Selection Schedule" action that generates the turn list for the upcoming selection year:

- Shows the year it will create and the rotation order it will use (Grandy, Comeau, Poznanovich, Woolf, Cook, Andrew — rotated forward for 2027).
- Creates one turn per family group, 14 days each, starting October 1, using the existing generator.
- Refuses to run twice for the same year; if turns already exist it says so and shows them.
- Lists the generated turns with their dates so they can be reviewed before October.

## 3. Show the upcoming schedule on Notification Management

Under the Automated System tab, list the upcoming selection turns for the selection year with their dates, and, when no schedule exists for that year, show a plain message: "No selection schedule has been created for 2027 yet" with a link to Reservation Setup, instead of silently showing nothing.

# Technical notes

- `useRotationOrder.getSelectionRotationYear()` currently returns `currentYear + 1` only once `today >= new Date(currentYear, startMonthIndex, 1)`. Add a lookahead window (60 days) so the rollover happens before the start date. `UpcomingRemindersPreview`, `NotificationManagement`, and `ManualTemplateNotifications` all consume this value and pick up the fix automatically.
- `useReservationPeriods.generateReservationPeriods(selectionYear)` already builds and inserts the rows (it stores `rotation_year = selectionYear + 1`) and is duplicate-safe; it is currently not called from any component. Wire it to the new Reservation Setup action.
- The org's most recent `rotation_orders` row (2026) holds only the `static_weeks_mode` marker with a null `start_month`; `useRotationOrder` already falls back to the 2025 row (October start, 14-day turns, first-to-last), which is the correct source for the 2027 order.
- No database schema changes. The only writes are the new `reservation_periods` rows for 2027, created when the user presses the generate button.
