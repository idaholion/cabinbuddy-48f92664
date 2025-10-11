-- Recalculate payments using daily_occupancy data when available
DO $$
DECLARE
  payment_record RECORD;
  settings_record RECORD;
  daily_record RECORD;
  total_amount NUMERIC := 0;
  base_amount NUMERIC := 0;
  nights INTEGER;
BEGIN
  FOR payment_record IN 
    SELECT p.id, p.organization_id, p.daily_occupancy, p.reservation_id, r.start_date, r.end_date
    FROM payments p
    LEFT JOIN reservations r ON p.reservation_id = r.id
    WHERE p.payment_type = 'use_fee'
      AND p.reservation_id IS NOT NULL
  LOOP
    -- Get organization settings
    SELECT nightly_rate, cleaning_fee, pet_fee, tax_rate, financial_method
    INTO settings_record
    FROM reservation_settings
    WHERE organization_id = payment_record.organization_id
    LIMIT 1;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    base_amount := 0;
    
    -- Check if daily_occupancy data exists and is not empty
    IF payment_record.daily_occupancy IS NOT NULL AND 
       jsonb_array_length(payment_record.daily_occupancy) > 0 THEN
      
      -- Calculate from daily_occupancy data
      FOR daily_record IN 
        SELECT 
          (value->>'guests')::integer as guests,
          (value->>'date')::date as stay_date
        FROM jsonb_array_elements(payment_record.daily_occupancy) as value
      LOOP
        -- Calculate per day based on method
        CASE COALESCE(settings_record.financial_method, 'per-person-per-day')
          WHEN 'per-person-per-day', 'per_person_per_night' THEN
            base_amount := base_amount + (daily_record.guests * COALESCE(settings_record.nightly_rate, 0));
          WHEN 'flat-rate-per-day', 'flat_rate_per_night' THEN
            base_amount := base_amount + COALESCE(settings_record.nightly_rate, 0);
          ELSE
            base_amount := base_amount + (daily_record.guests * COALESCE(settings_record.nightly_rate, 0));
        END CASE;
      END LOOP;
      
    ELSE
      -- No daily occupancy data, amount should be 0 as per requirement
      base_amount := 0;
    END IF;
    
    -- Add fees only if base_amount > 0
    IF base_amount > 0 THEN
      total_amount := base_amount + COALESCE(settings_record.cleaning_fee, 0) + COALESCE(settings_record.pet_fee, 0);
      
      -- Add tax if applicable
      IF settings_record.tax_rate IS NOT NULL AND settings_record.tax_rate > 0 THEN
        total_amount := total_amount * (1 + settings_record.tax_rate / 100);
      END IF;
    ELSE
      total_amount := 0;
    END IF;
    
    -- Update the payment
    UPDATE payments
    SET amount = total_amount,
        updated_at = now()
    WHERE id = payment_record.id;
    
  END LOOP;
END $$;