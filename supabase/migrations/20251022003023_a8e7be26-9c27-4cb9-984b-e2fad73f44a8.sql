-- Fix rotation year to match the actual selection dates (2025)
UPDATE reservation_periods 
SET 
  rotation_year = 2025,
  updated_at = now()
WHERE rotation_year = 2026
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND selection_start_date >= '2025-10-01'
  AND selection_start_date < '2026-01-01';