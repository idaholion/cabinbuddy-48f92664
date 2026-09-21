# Why no 2027 selection reminders are going out

The people still holding 2026 reservations are not the cause. Nothing about existing bookings blocks next year.

What I found, checking your actual records:

1. **The 2027 list you see at the bottom of Reservation Setup is calculated on screen, not saved.** It works out who is next by rotating the 2025 order forward. Nothing about 2027 is stored, so the notification system has nothing to read.

2. **The stored season records stop at 2026.** For 2025 there is a complete season record: the family order, an October start, 14-day turns, and a marker for whose turn it is. That is why the 2025-to-2026 emails went out. The 2026 record was overwritten with a "static weeks" marker and holds no family order and no turn marker, and there is no 2027 record at all. The nightly job looks for those records, finds nothing usable, and moves on.

3. **The nightly job also has a broken lookup.** It asks for a rotation start-month field that no longer exists on that table, so the request fails and every organization gets skipped before any turn check happens. This must be fixed or no automatic selection emails can ever send, even once 2027 records exist.

4. **The turn dates for 2027 were never created either.** Saved turn dates exist only for 2025 and 2026 (the 2026 turns ran Aug 25 to Nov 8, 2025). No screen in the app currently creates them for a new year.

5. **Even with all of that fixed, the preview would stay blank until Oct 1.** The app only switches to the next selection year on the start date itself, so nothing shows in advance.

# What to change

## 1. Repair the nightly selection-turn job

Remove the reference to the missing start-month field so the job can read each organization's season record again and resume sending turn notifications and "your turn ends tomorrow" reminders.

## 2. Add "Start the 2027 selection season" to Reservation Setup

A single action near the rotation list that creates everything a season needs, previewing it before saving:

- The 2027 family order rotated forward from your saved base order: Poznanovich, Woolf, Cook, Andrew, Grandy, Comeau.
- October 1 start, 14-day turns, one dated turn per family.
- The first family marked as the current turn, so the nightly job has someone to notify.
- Each family's allowance for the year, so turns can advance.

It shows the order and dates before saving, refuses to run twice for the same year, and lists what exists if a season is already set up.

## 3. Look ahead to the upcoming season before it starts

Roll the app over to the next selection year once we are within 60 days of the October start, so the upcoming turns appear on Notification Management and in the 30-day reminder preview during the run-up instead of only on the day it begins.

## 4. Say when a season is missing

Where selection reminders are listed, show a plain message such as "No selection season has been set up for 2027 yet" with a link to Reservation Setup, instead of showing nothing.

# Technical notes

- `supabase/functions/check-selection-turn-changes/index.ts` line ~179 selects `rotation_start_month` from `rotation_orders`; that column does not exist, so the query errors, `rotationData` is null, and every org/year iteration hits `continue`. Drop the field (it is unused downstream) and redeploy. The `selection-period-notifications` cron job (daily 15:00 UTC) already calls it.
- Season creation writes: a `rotation_orders` row for 2027 (`rotation_order`, `start_month` October, `selection_days` 14, `first_last_option` first, `current_primary_turn_family` = first group), `reservation_periods` rows via the existing `useReservationPeriods.generateReservationPeriods(2026)` helper (it stores `rotation_year = selectionYear + 1` and is duplicate-safe, but is currently not called anywhere), and `time_period_usage` rows per family group for 2027.
- `useRotationOrder.getSelectionRotationYear()` currently returns `currentYear + 1` only once `today >= new Date(currentYear, startMonthIndex, 1)`. Add a 60-day lookahead window; `UpcomingRemindersPreview`, `NotificationManagement`, and `ManualTemplateNotifications` all consume it and pick the change up automatically.
- The 2026 `rotation_orders` row holds only the `static_weeks_mode` marker; leave it alone. `useRotationOrder` already falls back to the 2025 row for the base order.
- No schema changes. New rows are written only when the user presses the season-setup button.
