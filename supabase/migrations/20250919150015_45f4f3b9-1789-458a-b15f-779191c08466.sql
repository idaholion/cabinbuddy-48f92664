-- Add columns for automated selection period and work weekend reminders
ALTER TABLE organizations 
ADD COLUMN automated_selection_reminders_enabled BOOLEAN DEFAULT false,
ADD COLUMN automated_work_weekend_reminders_enabled BOOLEAN DEFAULT false;