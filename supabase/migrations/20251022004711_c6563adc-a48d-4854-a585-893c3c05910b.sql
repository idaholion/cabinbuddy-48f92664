-- Update rotation_year to 2026 for selection periods starting in fall 2025
-- These periods are for making 2026 reservations
UPDATE reservation_periods 
SET 
  rotation_year = 2026,
  updated_at = now()
WHERE selection_start_date >= '2025-10-01'
  AND selection_start_date < '2026-01-01';