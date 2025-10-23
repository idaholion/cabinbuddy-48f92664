-- Fix payment records with empty daily_occupancy arrays to have $0.00 charge
CREATE OR REPLACE FUNCTION public.fix_empty_occupancy_payments(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  IF NOT (is_organization_admin() AND validate_organization_access(p_organization_id, 'fix_payments')) THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can fix payment records';
  END IF;
  
  UPDATE payments
  SET 
    amount = 0.00,
    daily_occupancy = COALESCE(daily_occupancy, '[]'::jsonb),
    updated_at = now()
  WHERE organization_id = p_organization_id
    AND (
      daily_occupancy IS NULL 
      OR daily_occupancy = '{}'::jsonb
      OR daily_occupancy = '[]'::jsonb
      OR jsonb_typeof(daily_occupancy) = 'null'
    )
    AND amount > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', format('Fixed %s payment records with empty occupancy', updated_count)
  );
END;
$function$;