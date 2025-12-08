-- First, drop and recreate the trigger function properly
-- The issue is that in a partial UPDATE, PostgreSQL doesn't provide all columns in NEW record
-- We need to use a different approach - accessing the column via the actual table

DROP TRIGGER IF EXISTS update_payment_status_trigger ON payments;

CREATE OR REPLACE FUNCTION public.update_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_amount_paid NUMERIC;
  v_amount NUMERIC;
BEGIN
  -- For UPDATE operations, get values from NEW or fall back to OLD
  IF TG_OP = 'UPDATE' THEN
    v_amount_paid := COALESCE(NEW.amount_paid, OLD.amount_paid, 0);
    v_amount := COALESCE(NEW.amount, OLD.amount, 0);
    
    -- Set the NEW values
    NEW.amount_paid := v_amount_paid;
    NEW.amount := v_amount;
  ELSE
    -- For INSERT operations
    v_amount_paid := COALESCE(NEW.amount_paid, 0);
    v_amount := COALESCE(NEW.amount, 0);
    NEW.amount_paid := v_amount_paid;
    NEW.amount := v_amount;
  END IF;
  
  -- Update status based on amount paid vs amount due
  IF v_amount_paid >= v_amount AND v_amount > 0 THEN
    NEW.status = 'paid';
    NEW.paid_date = COALESCE(NEW.paid_date, CURRENT_DATE);
  ELSIF v_amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND v_amount_paid = 0 THEN
    NEW.status = 'overdue';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER update_payment_status_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();