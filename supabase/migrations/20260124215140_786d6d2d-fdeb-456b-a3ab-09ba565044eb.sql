-- Fix stale secondary selection status for 2026
-- The turn_completed is true but current_family_group is still set, causing display issues
UPDATE secondary_selection_status 
SET current_family_group = NULL, updated_at = now()
WHERE rotation_year = 2026 
  AND turn_completed = true 
  AND current_family_group IS NOT NULL;