-- Restore Cook Family's turn_completed to true for 2026
-- This field tracks PRIMARY selection completion and should remain true
-- Secondary turn tracking is handled separately in secondary_selection_status

UPDATE time_period_usage 
SET turn_completed = true 
WHERE family_group = 'Cook Family' 
AND rotation_year = 2026 
AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';