-- Add individual timing controls for reservation and work weekend reminders
ALTER TABLE organizations 
ADD COLUMN automated_reminders_7_day_enabled boolean DEFAULT true,
ADD COLUMN automated_reminders_3_day_enabled boolean DEFAULT true,
ADD COLUMN automated_reminders_1_day_enabled boolean DEFAULT true,
ADD COLUMN automated_work_weekend_7_day_enabled boolean DEFAULT true,
ADD COLUMN automated_work_weekend_3_day_enabled boolean DEFAULT true,
ADD COLUMN automated_work_weekend_1_day_enabled boolean DEFAULT true;