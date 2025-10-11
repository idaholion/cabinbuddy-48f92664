-- Update the trigger to use 0 as default guest count instead of 4
CREATE OR REPLACE FUNCTION public.calculate_reservation_total_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  settings RECORD;
  nights INTEGER;
  guests INTEGER;
BEGIN
  -- Only calculate if total_cost is NULL or 0
  IF NEW.total_cost IS NULL OR NEW.total_cost = 0 THEN
    -- Get organization's reservation settings
    SELECT nightly_rate, cleaning_fee, pet_fee, financial_method
    INTO settings
    FROM reservation_settings
    WHERE organization_id = NEW.organization_id
    LIMIT 1;
    
    -- Calculate nights (end_date - start_date)
    nights := NEW.end_date - NEW.start_date;
    
    -- Use guest_count from reservation, default to 0 if NULL
    guests := COALESCE(NEW.guest_count, 0);
    
    -- Calculate total cost based on billing method
    IF settings.nightly_rate IS NOT NULL AND settings.nightly_rate > 0 THEN
      CASE COALESCE(settings.financial_method, 'per-person-per-day')
        WHEN 'per-person-per-day', 'per_person_per_night' THEN
          NEW.total_cost := (nights * guests * settings.nightly_rate) + COALESCE(settings.cleaning_fee, 0);
        WHEN 'flat-rate-per-day', 'flat_rate_per_night' THEN
          NEW.total_cost := (nights * settings.nightly_rate) + COALESCE(settings.cleaning_fee, 0);
        ELSE
          NEW.total_cost := (nights * guests * settings.nightly_rate) + COALESCE(settings.cleaning_fee, 0);
      END CASE;
    ELSE
      -- Fallback: set to 0 if no settings found
      NEW.total_cost := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recalculate existing payments with 0 as default guest count
DO $$
DECLARE
  payment_record RECORD;
  settings_record RECORD;
  nights INTEGER;
  guests INTEGER;
  new_amount NUMERIC;
BEGIN
  FOR payment_record IN 
    SELECT p.id, p.organization_id, p.reservation_id, r.start_date, r.end_date, r.guest_count
    FROM payments p
    JOIN reservations r ON p.reservation_id = r.id
    WHERE p.payment_type = 'use_fee'
      AND p.reservation_id IS NOT NULL
      AND r.start_date IS NOT NULL 
      AND r.end_date IS NOT NULL
  LOOP
    SELECT nightly_rate, cleaning_fee, pet_fee, tax_rate, financial_method
    INTO settings_record
    FROM reservation_settings
    WHERE organization_id = payment_record.organization_id
    LIMIT 1;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    nights := payment_record.end_date - payment_record.start_date;
    guests := COALESCE(payment_record.guest_count, 0);
    
    CASE COALESCE(settings_record.financial_method, 'per-person-per-day')
      WHEN 'per-person-per-day', 'per_person_per_night' THEN
        new_amount := nights * guests * COALESCE(settings_record.nightly_rate, 0);
      WHEN 'flat-rate-per-day', 'flat_rate_per_night' THEN
        new_amount := nights * COALESCE(settings_record.nightly_rate, 0);
      ELSE
        new_amount := nights * guests * COALESCE(settings_record.nightly_rate, 0);
    END CASE;
    
    new_amount := new_amount + COALESCE(settings_record.cleaning_fee, 0) + COALESCE(settings_record.pet_fee, 0);
    
    IF settings_record.tax_rate IS NOT NULL AND settings_record.tax_rate > 0 THEN
      new_amount := new_amount * (1 + settings_record.tax_rate / 100);
    END IF;
    
    UPDATE payments
    SET amount = new_amount,
        updated_at = now()
    WHERE id = payment_record.id;
    
  END LOOP;
END $$;