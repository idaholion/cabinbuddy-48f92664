-- Create a security definer function to reset selection for testing
-- This bypasses RLS policies for testing purposes

CREATE OR REPLACE FUNCTION reset_selection_for_testing(
  org_id uuid,
  target_family_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_reservations int;
  updated_usage int;
  deleted_periods int;
BEGIN
  -- Delete all 2025 reservations
  DELETE FROM reservations 
  WHERE organization_id = org_id 
  AND start_date >= '2025-01-01';
  
  GET DIAGNOSTICS deleted_reservations = ROW_COUNT;
  
  -- Reset time period usage
  UPDATE time_period_usage 
  SET time_periods_used = 0, selection_round = 'primary'
  WHERE organization_id = org_id 
  AND rotation_year = 2025;
  
  GET DIAGNOSTICS updated_usage = ROW_COUNT;
  
  -- Delete reservation periods
  DELETE FROM reservation_periods 
  WHERE organization_id = org_id 
  AND rotation_year = 2025;
  
  GET DIAGNOSTICS deleted_periods = ROW_COUNT;
  
  -- Set target family as current selector
  INSERT INTO reservation_periods (
    organization_id,
    rotation_year,
    current_group_index,
    current_group_name,
    status,
    period_start
  ) VALUES (
    org_id,
    2025,
    0,
    target_family_name,
    'active',
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_reservations', deleted_reservations,
    'updated_usage', updated_usage,
    'deleted_periods', deleted_periods,
    'current_selector', target_family_name
  );
END;
$$;