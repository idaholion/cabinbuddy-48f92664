-- Fix Cook Family's turn_completed - it must remain true for primary completion
-- Secondary selection turn is tracked separately in secondary_selection_status table

UPDATE time_period_usage 
SET turn_completed = true
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026 
AND family_group = 'Cook Family';