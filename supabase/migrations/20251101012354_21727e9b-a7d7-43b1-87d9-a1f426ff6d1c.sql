-- Fix Cook Family's turn_completed flag for 2026 secondary selection
-- They are the current family but the flag is incorrectly set to true

UPDATE time_period_usage 
SET turn_completed = false 
WHERE family_group = 'Cook Family' 
AND rotation_year = 2026 
AND EXISTS (
  SELECT 1 FROM secondary_selection_status 
  WHERE secondary_selection_status.current_family_group = 'Cook Family' 
  AND secondary_selection_status.rotation_year = 2026
  AND secondary_selection_status.turn_completed = false
);