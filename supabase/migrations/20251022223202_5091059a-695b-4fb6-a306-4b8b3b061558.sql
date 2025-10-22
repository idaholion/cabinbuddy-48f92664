-- Temporarily disable validation trigger for testing reset
ALTER TABLE reservations DISABLE TRIGGER validate_reservations_access;

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
  current_family_group,
  selection_start_date,
  selection_end_date,
  reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  2025,
  0,
  'Andrew Family',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  false
);

-- Re-enable validation trigger
ALTER TABLE reservations ENABLE TRIGGER validate_reservations_access;