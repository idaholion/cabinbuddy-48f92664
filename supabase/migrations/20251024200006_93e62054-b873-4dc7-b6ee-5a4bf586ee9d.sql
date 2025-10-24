-- Add current_primary_turn_family to rotation_orders table
ALTER TABLE rotation_orders 
ADD COLUMN current_primary_turn_family text;

-- Initialize it with the first family in rotation that hasn't completed their turn
UPDATE rotation_orders ro
SET current_primary_turn_family = (
  SELECT tpu.family_group
  FROM time_period_usage tpu
  CROSS JOIN LATERAL jsonb_array_elements_text(ro.rotation_order) WITH ORDINALITY AS ro_order(family_name, pos)
  WHERE tpu.organization_id = ro.organization_id
    AND tpu.rotation_year = ro.rotation_year
    AND tpu.turn_completed = false
    AND tpu.family_group = ro_order.family_name
  ORDER BY ro_order.pos
  LIMIT 1
)
WHERE rotation_year >= 2025;

-- Add comment
COMMENT ON COLUMN rotation_orders.current_primary_turn_family IS 'The family group whose turn it currently is in the primary selection phase';