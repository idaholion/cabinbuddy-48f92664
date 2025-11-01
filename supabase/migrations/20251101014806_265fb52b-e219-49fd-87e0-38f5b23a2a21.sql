-- Fix corrupted secondary_periods_used counts in time_period_usage
-- The old reconciliation logic incorrectly counted null time_period_number as secondary
-- Only time_period_number = -1 should count as secondary selections

-- Reset all families' secondary counters to accurate values based on actual secondary selections
UPDATE time_period_usage 
SET 
  secondary_periods_used = CASE 
    WHEN family_group IN ('Andrew Family', 'Grandy Family') THEN 1  -- These families completed 1 secondary selection
    ELSE 0  -- All other families haven't made secondary selections yet
  END,
  turn_completed = CASE
    WHEN family_group IN ('Andrew Family', 'Grandy Family') THEN true  -- These families completed their turns
    WHEN family_group = 'Cook Family' THEN false  -- Cook is currently selecting
    ELSE false  -- Others haven't started yet
  END,
  updated_at = now()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026;