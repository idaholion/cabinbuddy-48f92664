-- Add season configuration columns to reservation_settings table
ALTER TABLE reservation_settings 
ADD COLUMN IF NOT EXISTS season_start_month INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS season_start_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS season_end_month INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS season_end_day INTEGER DEFAULT 31,
ADD COLUMN IF NOT EXISTS season_payment_deadline_offset_days INTEGER DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN reservation_settings.season_start_month IS 'Month (1-12) when the billing season starts';
COMMENT ON COLUMN reservation_settings.season_start_day IS 'Day of month (1-31) when the billing season starts';
COMMENT ON COLUMN reservation_settings.season_end_month IS 'Month (1-12) when the billing season ends';
COMMENT ON COLUMN reservation_settings.season_end_day IS 'Day of month (1-31) when the billing season ends';
COMMENT ON COLUMN reservation_settings.season_payment_deadline_offset_days IS 'Days after season end date when payment is due (0 = same day as season end)';