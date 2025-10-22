-- Reset Andrew Family for rotation year 2026 (which is the active year)
UPDATE time_period_usage
SET time_periods_used = 0,
    last_selection_date = NULL
WHERE family_group = 'Andrew Family' 
  AND rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';

-- Also reset/update secondary selection status if exists for 2026
UPDATE secondary_selection_status
SET current_family_group = 'Andrew Family',
    current_group_index = 0,
    updated_at = now()
WHERE rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';

-- If no secondary selection exists for 2026, ensure it doesn't interfere
DELETE FROM secondary_selection_status 
WHERE rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';