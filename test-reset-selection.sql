-- Temporary script to reset selection for testing
-- Run this in Supabase SQL Editor

-- Temporarily disable RLS for this session
SET LOCAL session_authorization = 'postgres';

-- Delete all 2025 reservations
DELETE FROM reservations 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND start_date >= '2025-01-01';

-- Reset time period usage
UPDATE time_period_usage 
SET time_periods_used = 0, selection_round = 'primary'
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2025;

-- Delete reservation periods
DELETE FROM reservation_periods 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2025;

-- Set Andrew Family as current selector
INSERT INTO reservation_periods (
  organization_id,
  rotation_year,
  current_group_index,
  current_group_name,
  status,
  period_start
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  2025,
  0,
  'Andrew Family',
  'active',
  NOW()
);

-- Reset session authorization
RESET session_authorization;
