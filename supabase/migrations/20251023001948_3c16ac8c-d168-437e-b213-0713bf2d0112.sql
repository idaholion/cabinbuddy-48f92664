-- Phase 1: Delete 54 duplicate Woolf $180 payments (keep the oldest one)
DELETE FROM payments 
WHERE reservation_id IS NULL 
  AND family_group = 'Woolf Family'
  AND amount = 180.00
  AND description = 'Use fee (split with 1 person) - 2025-10-06 to 2025-10-11'
  AND id != 'ee78a94f-6773-4a21-80ea-b12dfff33eff';

-- Phase 2: Delete duplicate Andrew $30 payment (keep the deferred use fee payment)
DELETE FROM payments 
WHERE id = '726d5686-b61f-47cf-bf5f-3d8e6737d919';

-- Phase 3: Fix the link_orphaned_payments_to_reservations function
DROP FUNCTION IF EXISTS link_orphaned_payments_to_reservations(uuid);

-- Recreate the function with correct column names (start_date/end_date instead of check_in_date/check_out_date)
CREATE OR REPLACE FUNCTION link_orphaned_payments_to_reservations(p_organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked_count INTEGER := 0;
  v_payment RECORD;
  v_reservation RECORD;
BEGIN
  -- Loop through all orphaned payments (with daily_occupancy data)
  FOR v_payment IN 
    SELECT 
      id,
      organization_id,
      family_group,
      daily_occupancy,
      (daily_occupancy->0->>'date')::date as start_date,
      (daily_occupancy->(jsonb_array_length(daily_occupancy)-1)->>'date')::date as end_date
    FROM payments
    WHERE reservation_id IS NULL
      AND daily_occupancy IS NOT NULL
      AND jsonb_array_length(daily_occupancy) > 0
      AND (p_organization_id IS NULL OR organization_id = p_organization_id)
  LOOP
    -- Try to find a matching reservation
    SELECT id INTO v_reservation
    FROM reservations
    WHERE organization_id = v_payment.organization_id
      AND family_group = v_payment.family_group
      AND start_date = v_payment.start_date
      AND end_date = v_payment.end_date
      AND status = 'confirmed'
    LIMIT 1;
    
    -- If a match is found, link the payment
    IF v_reservation.id IS NOT NULL THEN
      UPDATE payments
      SET 
        reservation_id = v_reservation.id,
        updated_at = now()
      WHERE id = v_payment.id;
      
      v_linked_count := v_linked_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'linked_payments', v_linked_count,
    'message', format('Successfully linked %s orphaned payment(s) to reservations', v_linked_count)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION link_orphaned_payments_to_reservations(uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION link_orphaned_payments_to_reservations(uuid) IS 
'Attempts to link orphaned payments (reservation_id = NULL) to existing reservations by matching organization, family group, and date ranges. Returns the count of successfully linked payments.';