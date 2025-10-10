-- Fix security warning: Add search_path to trigger functions
DROP FUNCTION IF EXISTS update_billing_cycles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_invoices_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_billing_cycles_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_billing_cycles_timestamp
  BEFORE UPDATE ON billing_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_cycles_updated_at();

CREATE TRIGGER update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();