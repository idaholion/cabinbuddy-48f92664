-- Fix secondary_periods_used counts for 2026
-- Only Andrew and Grandy have actual secondary selections (time_period_number = -1)
-- All others should have 0

UPDATE time_period_usage 
SET 
  secondary_periods_used = CASE family_group
    WHEN 'Andrew Family' THEN 1
    WHEN 'Grandy Family' THEN 1
    ELSE 0
  END,
  turn_completed = CASE family_group
    WHEN 'Cook Family' THEN false  -- Cook is currently selecting
    ELSE true  -- All others have completed their turns
  END,
  updated_at = now()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026;