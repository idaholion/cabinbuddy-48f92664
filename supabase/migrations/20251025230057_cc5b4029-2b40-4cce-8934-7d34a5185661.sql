-- Restore missing 2026 rotation_orders record with correct rotated order
-- 2025 order: Grandy, Comeau, Poznanovich, Woolf, Cook, Andrew
-- 2026 order: Comeau, Poznanovich, Woolf, Cook, Andrew, Grandy (first moves to last)

INSERT INTO rotation_orders (
  organization_id,
  rotation_year,
  rotation_order,
  current_primary_turn_family,
  selection_days,
  first_last_option,
  max_time_slots,
  max_nights,
  start_day,
  start_time,
  start_month,
  enable_secondary_selection,
  secondary_max_periods,
  enable_post_rotation_selection,
  secondary_selection_days,
  use_virtual_weeks_system,
  total_nights_allowed_primary,
  total_weeks_allowed_primary,
  total_weeks_allowed_secondary,
  min_nights_per_booking,
  max_consecutive_nights_primary,
  max_consecutive_nights_secondary,
  post_rotation_min_nights,
  post_rotation_max_consecutive_nights,
  post_rotation_max_weeks,
  created_at,
  updated_at
)
SELECT 
  organization_id,
  2026 AS rotation_year,
  '["Comeau Family", "Poznanovich Family", "Woolf Family", "Cook Family", "Andrew Family", "Grandy Family"]'::jsonb AS rotation_order,
  'Andrew Family' AS current_primary_turn_family,
  selection_days,
  first_last_option,
  max_time_slots,
  max_nights,
  start_day,
  start_time,
  start_month,
  enable_secondary_selection,
  secondary_max_periods,
  enable_post_rotation_selection,
  secondary_selection_days,
  use_virtual_weeks_system,
  total_nights_allowed_primary,
  total_weeks_allowed_primary,
  total_weeks_allowed_secondary,
  min_nights_per_booking,
  max_consecutive_nights_primary,
  max_consecutive_nights_secondary,
  post_rotation_min_nights,
  post_rotation_max_consecutive_nights,
  post_rotation_max_weeks,
  NOW() AS created_at,
  NOW() AS updated_at
FROM rotation_orders
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year = 2025;