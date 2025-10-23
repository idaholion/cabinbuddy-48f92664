-- Drop existing function and recreate with proper linking logic
DROP FUNCTION IF EXISTS public.link_orphaned_payments_to_reservations(uuid);

CREATE OR REPLACE FUNCTION public.link_orphaned_payments_to_reservations(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payment_record RECORD;
  reservation_record RECORD;
  linked_count INTEGER := 0;
  payment_dates TEXT[];
  reservation_dates TEXT[];
  overlap_count INTEGER;
  best_match_id UUID;
  best_overlap INTEGER;
BEGIN
  -- Only allow admins to link payments
  IF NOT (is_organization_admin() AND validate_organization_access(p_organization_id, 'link_payments')) THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can link payments';
  END IF;

  -- Loop through orphaned payments with daily occupancy data
  FOR payment_record IN 
    SELECT * FROM payments 
    WHERE organization_id = p_organization_id 
    AND reservation_id IS NULL
    AND daily_occupancy IS NOT NULL 
    AND jsonb_array_length(daily_occupancy) > 0
  LOOP
    -- Extract dates from payment's daily_occupancy
    SELECT ARRAY_AGG(d->>'date') INTO payment_dates
    FROM jsonb_array_elements(payment_record.daily_occupancy) AS d;
    
    best_match_id := NULL;
    best_overlap := 0;
    
    -- Find matching reservation by family group and date overlap
    FOR reservation_record IN 
      SELECT * FROM reservations 
      WHERE organization_id = p_organization_id 
      AND family_group = payment_record.family_group
      AND status = 'confirmed'
    LOOP
      -- Generate reservation date range
      SELECT ARRAY_AGG(date_series::DATE::TEXT) INTO reservation_dates
      FROM generate_series(
        reservation_record.start_date::DATE,
        reservation_record.end_date::DATE - INTERVAL '1 day',
        '1 day'::INTERVAL
      ) AS date_series;
      
      -- Count overlapping dates
      SELECT COUNT(*) INTO overlap_count
      FROM UNNEST(payment_dates) AS pd
      WHERE pd = ANY(reservation_dates);
      
      -- Track best match (highest overlap)
      IF overlap_count > best_overlap THEN
        best_overlap := overlap_count;
        best_match_id := reservation_record.id;
      END IF;
    END LOOP;
    
    -- Link payment if we found a match with at least 50% overlap
    IF best_match_id IS NOT NULL AND best_overlap >= (ARRAY_LENGTH(payment_dates, 1) / 2) THEN
      UPDATE payments 
      SET 
        reservation_id = best_match_id,
        updated_at = NOW()
      WHERE id = payment_record.id;
      
      linked_count := linked_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'linked_payments', linked_count,
    'message', format('Successfully linked %s orphaned payment(s) to reservations', linked_count)
  );
END;
$$;