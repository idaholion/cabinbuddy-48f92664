-- Add calendar keeper notification copy settings to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS calendar_keeper_receives_notification_copies BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN organizations.calendar_keeper_receives_notification_copies IS 'When enabled, calendar keeper receives copies of all automated notifications sent to families';