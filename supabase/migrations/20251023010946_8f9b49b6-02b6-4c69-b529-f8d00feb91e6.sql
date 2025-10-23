-- Add default_occupancy setting to prevent hardcoded assumptions
ALTER TABLE reservation_settings 
ADD COLUMN IF NOT EXISTS default_occupancy INTEGER DEFAULT 0 CHECK (default_occupancy >= 0);

COMMENT ON COLUMN reservation_settings.default_occupancy IS 'Default number of guests to assume when occupancy data is not available. Set to 0 to require explicit occupancy entry.';