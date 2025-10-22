-- Update supervisor function to correctly set usage to 2/2
CREATE OR REPLACE FUNCTION supervisor_fix_barb_reservations()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Fix Barb's reservations: Remove incorrect time_period_number
  -- These are manual selections, not tied to specific period numbers
  UPDATE reservations 
  SET 
    time_period_number = NULL,
    updated_at = now()
  WHERE id IN (
    '88c8d699-3d39-4170-ab4e-cce711c8c44a',  -- June 19-26
    'bee92095-db25-448d-bd6c-875c618a5994'   -- July 17-24
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Add Barb as host to the June reservation if missing
  UPDATE reservations
  SET 
    host_assignments = '[{"host_name": "Barb Woolf", "host_email": "54bjwoolf@gmail.com", "start_date": "2026-06-19", "end_date": "2026-06-26"}]'::jsonb,
    updated_at = now()
  WHERE id = '88c8d699-3d39-4170-ab4e-cce711c8c44a'
    AND (host_assignments IS NULL OR host_assignments = '[]'::jsonb);
  
  -- Set Woolf Family's time period usage to 2/2 (she has selected both periods)
  UPDATE time_period_usage
  SET 
    time_periods_used = 2,  -- Barb selected 2 weeks, so 2/2 periods used
    updated_at = now()
  WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
    AND rotation_year = 2026
    AND family_group = 'Woolf Family';
  
  RETURN format('Fixed %s reservations and set Woolf Family usage to 2/2', updated_count);
END;
$$;