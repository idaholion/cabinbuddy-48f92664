-- Add automated_selection_ending_tomorrow_enabled column to organizations table
ALTER TABLE organizations 
ADD COLUMN automated_selection_ending_tomorrow_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN organizations.automated_selection_ending_tomorrow_enabled IS 'Enable automated reminders one day before selection time expires';