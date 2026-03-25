-- Fix the rotation_orders for 2026: enable post-rotation free selection
UPDATE rotation_orders 
SET enable_post_rotation_selection = true,
    enable_secondary_selection = true,
    updated_at = now()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
  AND rotation_year = 2026;

-- Fix turn_completed for all families that used their secondary period but didn't get recorded
UPDATE time_period_usage 
SET turn_completed = true
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
  AND rotation_year = 2026
  AND secondary_periods_used >= 1
  AND turn_completed = false;