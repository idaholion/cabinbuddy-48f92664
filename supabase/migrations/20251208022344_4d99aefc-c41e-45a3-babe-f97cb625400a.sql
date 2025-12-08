-- Drop ALL triggers on payments table that use update_payment_status
DROP TRIGGER IF EXISTS trigger_update_payment_status ON payments;
DROP TRIGGER IF EXISTS update_payment_status_trigger ON payments;

-- Now create a proper trigger function that doesn't break with generated columns
-- The issue is that generated columns affect how PostgreSQL builds the NEW record
CREATE OR REPLACE FUNCTION public.update_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update status based on amount paid vs amount due
  -- balance_due is a generated column, so we calculate it here for comparison
  IF COALESCE(NEW.amount_paid, 0) >= NEW.amount AND NEW.amount > 0 THEN
    NEW.status = 'paid';
    NEW.paid_date = COALESCE(NEW.paid_date, CURRENT_DATE);
  ELSIF COALESCE(NEW.amount_paid, 0) > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND COALESCE(NEW.amount_paid, 0) = 0 THEN
    NEW.status = 'overdue';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Create just one trigger
CREATE TRIGGER update_payment_status_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();