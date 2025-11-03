-- Fix Andrew Family's turn_completed status
-- This family completed their secondary selection days ago but the old buggy code
-- failed to mark turn_completed = true, causing incorrect notifications

UPDATE secondary_selection_status
SET 
  turn_completed = true,
  updated_at = NOW()
WHERE rotation_year = 2025
AND current_family_group = 'Andrew Family'
AND turn_completed = false;