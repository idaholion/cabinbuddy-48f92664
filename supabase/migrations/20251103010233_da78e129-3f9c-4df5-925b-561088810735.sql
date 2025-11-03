-- Add granular calendar keeper notification copy filters to organizations table

-- Reservation reminder copies
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS ck_copy_reminder_7_day BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ck_copy_reminder_3_day BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ck_copy_reminder_1_day BOOLEAN DEFAULT true;

-- Selection notification copies
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ck_copy_selection_turn_start BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ck_copy_selection_ending_tomorrow BOOLEAN DEFAULT true;

-- Work weekend copies
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ck_copy_work_weekend_reminder BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ck_copy_work_weekend_proposed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ck_copy_work_weekend_invitation BOOLEAN DEFAULT false;

-- Status change copies
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ck_copy_confirmation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ck_copy_cancellation BOOLEAN DEFAULT true;

-- Manual notification copies
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ck_copy_manual_template BOOLEAN DEFAULT false;

COMMENT ON COLUMN organizations.ck_copy_reminder_7_day IS 'Calendar keeper receives copies of 7-day reservation reminders';
COMMENT ON COLUMN organizations.ck_copy_reminder_3_day IS 'Calendar keeper receives copies of 3-day reservation reminders';
COMMENT ON COLUMN organizations.ck_copy_reminder_1_day IS 'Calendar keeper receives copies of 1-day reservation reminders';
COMMENT ON COLUMN organizations.ck_copy_selection_turn_start IS 'Calendar keeper receives copies of selection turn start notifications';
COMMENT ON COLUMN organizations.ck_copy_selection_ending_tomorrow IS 'Calendar keeper receives copies of selection ending tomorrow reminders';
COMMENT ON COLUMN organizations.ck_copy_work_weekend_reminder IS 'Calendar keeper receives copies of work weekend reminders';
COMMENT ON COLUMN organizations.ck_copy_work_weekend_proposed IS 'Calendar keeper receives copies of work weekend proposal notifications';
COMMENT ON COLUMN organizations.ck_copy_work_weekend_invitation IS 'Calendar keeper receives copies of work weekend invitation notifications';
COMMENT ON COLUMN organizations.ck_copy_confirmation IS 'Calendar keeper receives copies of booking confirmation notifications';
COMMENT ON COLUMN organizations.ck_copy_cancellation IS 'Calendar keeper receives copies of booking cancellation notifications';
COMMENT ON COLUMN organizations.ck_copy_manual_template IS 'Calendar keeper receives copies of manual template notifications';