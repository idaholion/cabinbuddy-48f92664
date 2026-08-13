# One Place to Turn Reminders On and Off

Agreed — two independent switches for the same reminder is confusing. The recommendation: the **Automated Reminder System** page becomes the single on/off control panel, and the **Reminder Templates** page becomes purely "what the message says and when it fires."

## What you'll see

**Automated Reminder System page**
- Master switch: Reservation Reminders (unchanged).
- Under it, instead of three fixed 7/3/1 rows, a live list of every scheduled reminder template in your organization, each with its own switch and a plain-English line, e.g.
  - "7-day reminder — sends 7 days before stay starts"
  - "3-day reminder — sends 3 days before stay starts"
  - "End of Stay Message — sends 3 days before stay ends"
- Add a new template in Reminder Templates and it automatically appears here with a switch.
- Selection turn, selection-ending, and work weekend sections stay as they are.

**Reminder Templates page**
- Keeps: message text, subject, SMS text, trigger (before start / before end), days in advance, add/delete.
- Loses: the Active switch. In its place, a read-only status badge ("On" / "Off") with a note: "Turn this reminder on or off in Calendar Keeper → Automated Reminder System."

## Data cleanup needed first

Current templates are inconsistent and this is why the two systems drifted apart:
- `seven_day`, `three_day`, `one_day` templates have no "days in advance" value stored — they need 7, 3, and 1 filled in so they can be scheduled from the template itself.
- Several templates (`password_reset`, `annual_meeting`, `general_reminder`, `selection_period_start`, `selection_deadline`, `work_weekend_reminder`) are event-driven or manual but are currently marked "before stay starts". They will be re-marked as manual so they do not appear as stay-schedule toggles and never fire on the nightly job.

Only the Andrew organization currently has the full template set; the two other organizations have only the end-of-stay template, which is unaffected.

## Technical details

1. **Data fix (insert tool, not schema):** set `days_in_advance` = 7/3/1 on the `seven_day`/`three_day`/`one_day` templates; set `trigger_event = 'manual'` on the event/manual templates listed above.
2. **`AutomatedReminderSettings.tsx`:** fetch `reminder_templates` for the active organization where `trigger_event` in (`before_start`,`before_end`) and `days_in_advance` is not null; render one Switch per template writing `is_active` back to `reminder_templates`. Remove the three hardcoded `automated_reminders_{7,3,1}_day_enabled` switches from the UI. Keep the org-level `automated_reminders_enabled` master switch.
3. **`send-reminder-notifications` edge function:** replace the hardcoded `orgReminderDays` built from the three org columns with a query over active `before_start` templates (using each template's `days_in_advance` and its own subject/message), mirroring how the existing `before_end` loop already works. The legacy columns stop being read.
4. **`ReminderTemplateManager.tsx`:** replace the Active switch with a read-only badge plus pointer text; leave save/delete/trigger/days controls intact.
5. The `automated_reminders_*_day_enabled` columns are left in the database untouched (no destructive schema change), just no longer read or written.
