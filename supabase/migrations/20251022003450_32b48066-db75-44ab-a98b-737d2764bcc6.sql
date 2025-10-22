-- Fix overlapping selection periods
-- Poznanovich should end Oct 20, not Oct 28

UPDATE reservation_periods 
SET 
  selection_end_date = '2025-10-20',
  updated_at = now()
WHERE current_family_group = 'Poznanovich Family' 
  AND rotation_year = 2025
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';