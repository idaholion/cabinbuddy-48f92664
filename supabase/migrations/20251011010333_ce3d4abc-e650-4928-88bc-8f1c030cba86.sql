-- Recalculate existing payment amounts based on actual organization settings
CREATE OR REPLACE FUNCTION recalculate_payment_amounts()
RETURNS void AS $$
DECLARE
  payment_record RECORD;
  settings_record RECORD;
  nights INTEGER;
  guests INTEGER;
  new_amount NUMERIC;
BEGIN
  -- Loop through all use_fee payments that have a reservation_id
  FOR payment_record IN 
    SELECT p.id, p.organization_id, p.reservation_id, r.start_date, r.end_date, r.guest_count
    FROM payments p
    JOIN reservations r ON p.reservation_id = r.id
    WHERE p.payment_type = 'use_fee'
      AND p.reservation_id IS NOT NULL
      AND r.start_date IS NOT NULL 
      AND r.end_date IS NOT NULL
  LOOP
    -- Get organization settings
    SELECT nightly_rate, cleaning_fee, pet_fee, tax_rate, financial_method
    INTO settings_record
    FROM reservation_settings
    WHERE organization_id = payment_record.organization_id
    LIMIT 1;
    
    -- Skip if no settings found
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- Calculate nights
    nights := payment_record.end_date - payment_record.start_date;
    
    -- Use guest_count from reservation, default to 4 if NULL
    guests := COALESCE(payment_record.guest_count, 4);
    
    -- Calculate amount based on billing method
    CASE COALESCE(settings_record.financial_method, 'per-person-per-day')
      WHEN 'per-person-per-day', 'per_person_per_night' THEN
        new_amount := nights * guests * COALESCE(settings_record.nightly_rate, 0);
      WHEN 'flat-rate-per-day', 'flat_rate_per_night' THEN
        new_amount := nights * COALESCE(settings_record.nightly_rate, 0);
      ELSE
        new_amount := nights * guests * COALESCE(settings_record.nightly_rate, 0);
    END CASE;
    
    -- Add fees
    new_amount := new_amount + COALESCE(settings_record.cleaning_fee, 0) + COALESCE(settings_record.pet_fee, 0);
    
    -- Add tax if applicable
    IF settings_record.tax_rate IS NOT NULL AND settings_record.tax_rate > 0 THEN
      new_amount := new_amount * (1 + settings_record.tax_rate / 100);
    END IF;
    
    -- Update only the payment amount (balance_due will be auto-calculated)
    UPDATE payments
    SET amount = new_amount,
        updated_at = now()
    WHERE id = payment_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Execute the recalculation
SELECT recalculate_payment_amounts();

-- Drop the function after use
DROP FUNCTION recalculate_payment_amounts();