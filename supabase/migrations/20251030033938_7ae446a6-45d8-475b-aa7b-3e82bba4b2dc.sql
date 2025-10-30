-- Fix Dana's Oct 2-9 booking to be properly marked as secondary selection
-- Update the reservation to set time_period_number = -1 for secondary selection
UPDATE reservations
SET time_period_number = -1
WHERE start_date = '2025-10-02' 
  AND end_date = '2025-10-09'
  AND time_period_number IS NULL;

-- Update time_period_usage to increment secondary_periods_used for Dana's family
-- First, get the current usage and increment it
UPDATE time_period_usage
SET 
  secondary_periods_used = COALESCE(secondary_periods_used, 0) + 1,
  updated_at = now()
WHERE family_group = (
  SELECT family_group 
  FROM reservations 
  WHERE start_date = '2025-10-02' 
    AND end_date = '2025-10-09'
  LIMIT 1
)
AND rotation_year = 2025
AND secondary_periods_used = 0;