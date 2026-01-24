-- Mark the secondary selection turn as completed for Grandy Family
-- This record was left incomplete even though selections are done
UPDATE secondary_selection_status 
SET turn_completed = true, updated_at = now()
WHERE id = '9f2270f0-4d68-4621-9733-7f4dfadc9a07'
  AND current_family_group = 'Grandy Family'
  AND rotation_year = 2026;