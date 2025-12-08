-- Fix the update_payment_status trigger to handle partial updates properly
CREATE OR REPLACE FUNCTION public.update_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use COALESCE to handle cases where amount_paid might not be in the update
  -- OLD values are used as fallback when NEW values aren't provided
  
  -- Ensure amount_paid has a value (use existing value if not provided in update)
  IF NEW.amount_paid IS NULL THEN
    NEW.amount_paid := COALESCE(OLD.amount_paid, 0);
  END IF;
  
  -- Ensure amount has a value
  IF NEW.amount IS NULL THEN
    NEW.amount := COALESCE(OLD.amount, 0);
  END IF;
  
  -- Calculate balance_due
  NEW.balance_due := NEW.amount - NEW.amount_paid;
  
  -- Update status based on amount paid vs amount due
  IF NEW.amount_paid >= NEW.amount AND NEW.amount > 0 THEN
    NEW.status = 'paid';
    NEW.paid_date = COALESCE(NEW.paid_date, CURRENT_DATE);
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.amount_paid = 0 THEN
    NEW.status = 'overdue';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$function$;