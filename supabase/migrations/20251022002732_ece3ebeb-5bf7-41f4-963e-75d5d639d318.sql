-- Update reservation periods with correct sequential dates
-- Woolf starts Oct 21, then Cook, Andrew, Grandy each 14 days apart

UPDATE reservation_periods 
SET 
  selection_start_date = '2025-10-21',
  selection_end_date = '2025-11-03',
  updated_at = now()
WHERE current_family_group = 'Woolf Family' 
  AND rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';

UPDATE reservation_periods 
SET 
  selection_start_date = '2025-11-04',
  selection_end_date = '2025-11-17',
  updated_at = now()
WHERE current_family_group = 'Cook Family' 
  AND rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';

UPDATE reservation_periods 
SET 
  selection_start_date = '2025-11-18',
  selection_end_date = '2025-12-01',
  updated_at = now()
WHERE current_family_group = 'Andrew Family' 
  AND rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';

UPDATE reservation_periods 
SET 
  selection_start_date = '2025-12-02',
  selection_end_date = '2025-12-15',
  updated_at = now()
WHERE current_family_group = 'Grandy Family' 
  AND rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';