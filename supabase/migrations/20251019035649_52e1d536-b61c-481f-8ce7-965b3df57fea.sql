
-- Create 2026 rotation order by copying from 2025
INSERT INTO rotation_orders (
  organization_id,
  rotation_year,
  rotation_order,
  max_time_slots,
  max_nights,
  start_day,
  start_time,
  first_last_option,
  start_month,
  selection_days,
  enable_secondary_selection,
  secondary_max_periods,
  enable_post_rotation_selection,
  secondary_selection_days,
  created_at,
  updated_at
)
SELECT 
  organization_id,
  2026 as rotation_year,
  rotation_order,
  max_time_slots,
  max_nights,
  start_day,
  start_time,
  first_last_option,
  start_month,
  selection_days,
  enable_secondary_selection,
  secondary_max_periods,
  enable_post_rotation_selection,
  secondary_selection_days,
  now() as created_at,
  now() as updated_at
FROM rotation_orders
WHERE rotation_year = 2025
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
ON CONFLICT (organization_id, rotation_year) DO NOTHING;
