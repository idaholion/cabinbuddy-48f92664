-- Create a function to link orphaned payments to reservations based on date overlap
CREATE OR REPLACE FUNCTION link_orphaned_payments_to_reservations(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  reservation_record RECORD;
  linked_count INTEGER := 0;
  payment_dates TEXT[];
  reservation_dates TEXT[];
  overlap_count INTEGER;
  best_match_id UUID;
  best_match_overlap INTEGER;
BEGIN
  -- Only allow supervisors or org admins to run this
  IF NOT (is_supervisor() OR is_organization_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only supervisors or organization admins can link orphaned payments';
  END IF;
  
  -- Loop through orphaned payments (null reservation_id) with daily_occupancy data
  FOR payment_record IN 
    SELECT id, family_group, daily_occupancy, amount
    FROM payments
    WHERE organization_id = p_organization_id
      AND reservation_id IS NULL
      AND daily_occupancy IS NOT NULL
      AND jsonb_array_length(daily_occupancy) > 0
  LOOP
    -- Extract payment dates
    SELECT array_agg(value->>'date')
    INTO payment_dates
    FROM jsonb_array_elements(payment_record.daily_occupancy);
    
    -- Find best matching reservation
    best_match_id := NULL;
    best_match_overlap := 0;
    
    FOR reservation_record IN
      SELECT id, check_in_date, check_out_date
      FROM reservations
      WHERE organization_id = p_organization_id
        AND family_group = payment_record.family_group
        AND check_in_date <= (SELECT MAX(value::date) FROM unnest(payment_dates) AS value)
        AND check_out_date >= (SELECT MIN(value::date) FROM unnest(payment_dates) AS value)
    LOOP
      -- Generate reservation date range
      SELECT array_agg(date_series::date::text)
      INTO reservation_dates
      FROM generate_series(
        reservation_record.check_in_date,
        reservation_record.check_out_date - interval '1 day',
        interval '1 day'
      ) AS date_series;
      
      -- Count overlapping dates
      SELECT COUNT(*)
      INTO overlap_count
      FROM unnest(payment_dates) pd
      WHERE pd = ANY(reservation_dates);
      
      -- Update best match if this is better
      IF overlap_count > best_match_overlap THEN
        best_match_id := reservation_record.id;
        best_match_overlap := overlap_count;
      END IF;
    END LOOP;
    
    -- If we found a good match (at least 50% overlap), link the payment
    IF best_match_id IS NOT NULL AND best_match_overlap >= (array_length(payment_dates, 1) * 0.5) THEN
      UPDATE payments
      SET reservation_id = best_match_id,
          updated_at = now()
      WHERE id = payment_record.id;
      
      linked_count := linked_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'linked_payments', linked_count,
    'message', format('Successfully linked %s orphaned payments to reservations', linked_count)
  );
END;
$$;