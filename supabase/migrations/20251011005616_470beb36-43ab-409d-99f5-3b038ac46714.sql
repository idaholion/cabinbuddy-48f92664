-- Add trigger to calculate total_cost for reservations if not provided
CREATE OR REPLACE FUNCTION public.calculate_reservation_total_cost()
RETURNS TRIGGER AS $$
DECLARE
  settings RECORD;
  nights INTEGER;
BEGIN
  -- Only calculate if total_cost is NULL or 0
  IF NEW.total_cost IS NULL OR NEW.total_cost = 0 THEN
    -- Get organization's reservation settings
    SELECT nightly_rate, cleaning_fee, pet_fee
    INTO settings
    FROM reservation_settings
    WHERE organization_id = NEW.organization_id
    LIMIT 1;
    
    -- Calculate nights (end_date - start_date)
    nights := NEW.end_date - NEW.start_date;
    
    -- Calculate total cost: (nights × nightly_rate) + cleaning_fee
    -- Note: pet_fee would need to be added manually when pets are involved
    IF settings.nightly_rate IS NOT NULL AND settings.nightly_rate > 0 THEN
      NEW.total_cost := (nights * settings.nightly_rate) + COALESCE(settings.cleaning_fee, 0);
    ELSE
      -- Fallback: set to 0 if no settings found
      NEW.total_cost := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-calculate total_cost on reservations
DROP TRIGGER IF EXISTS trigger_calculate_reservation_total_cost ON public.reservations;
CREATE TRIGGER trigger_calculate_reservation_total_cost
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_reservation_total_cost();

COMMENT ON FUNCTION public.calculate_reservation_total_cost() IS 'Automatically calculates total_cost for reservations based on organization settings when not provided';