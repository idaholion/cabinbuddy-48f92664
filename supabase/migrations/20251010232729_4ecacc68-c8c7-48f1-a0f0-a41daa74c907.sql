-- Create enum types for billing
CREATE TYPE billing_cycle_type AS ENUM ('end_of_year', 'end_of_season', 'monthly', 'custom');
CREATE TYPE billing_cycle_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE reminder_type AS ENUM ('30_day', '14_day', '7_day', 'due_date', 'overdue_weekly');
CREATE TYPE email_status AS ENUM ('sent', 'failed');
CREATE TYPE billing_frequency AS ENUM ('annual', 'seasonal', 'monthly', 'manual');

-- Create billing_cycles table
CREATE TABLE billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_type billing_cycle_type NOT NULL,
  cycle_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_deadline DATE NOT NULL,
  status billing_cycle_status NOT NULL DEFAULT 'draft',
  auto_send_invoices BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_cycle_id UUID REFERENCES billing_cycles(id) ON DELETE SET NULL,
  family_group TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_invoice_number_per_org UNIQUE (organization_id, invoice_number)
);

-- Create invoice_reminders_log table
CREATE TABLE invoice_reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient_emails TEXT[] NOT NULL,
  email_status email_status NOT NULL DEFAULT 'sent',
  error_message TEXT
);

-- Add billing configuration columns to reservation_settings table
ALTER TABLE reservation_settings 
ADD COLUMN IF NOT EXISTS billing_frequency billing_frequency DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV-',
ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1;

-- Create indexes for performance
CREATE INDEX idx_billing_cycles_org_id ON billing_cycles(organization_id);
CREATE INDEX idx_billing_cycles_status ON billing_cycles(status);
CREATE INDEX idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX idx_invoices_billing_cycle_id ON invoices(billing_cycle_id);
CREATE INDEX idx_invoices_family_group ON invoices(family_group);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoice_reminders_invoice_id ON invoice_reminders_log(invoice_id);
CREATE INDEX idx_invoice_reminders_org_id ON invoice_reminders_log(organization_id);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_billing_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_billing_cycles_timestamp
  BEFORE UPDATE ON billing_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_cycles_updated_at();

CREATE TRIGGER update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Enable RLS on all tables
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminders_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_cycles
-- Supervisors can manage all billing cycles
CREATE POLICY "Supervisors can manage all billing cycles"
  ON billing_cycles
  FOR ALL
  USING (is_supervisor());

-- Organization admins and treasurers can manage their organization's billing cycles
CREATE POLICY "Admins and treasurers can manage billing cycles"
  ON billing_cycles
  FOR ALL
  USING (
    organization_id = get_user_organization_id() 
    AND is_organization_admin()
  );

-- Users can view their organization's billing cycles
CREATE POLICY "Users can view their organization's billing cycles"
  ON billing_cycles
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- RLS Policies for invoices
-- Supervisors can manage all invoices
CREATE POLICY "Supervisors can manage all invoices"
  ON invoices
  FOR ALL
  USING (is_supervisor());

-- Organization admins and treasurers can manage their organization's invoices
CREATE POLICY "Admins and treasurers can manage invoices"
  ON invoices
  FOR ALL
  USING (
    organization_id = get_user_organization_id() 
    AND is_organization_admin()
  );

-- Users can view invoices for their family group
CREATE POLICY "Users can view their family group's invoices"
  ON invoices
  FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.organization_id = get_user_organization_id()
        AND family_groups.name = invoices.family_group
        AND (
          family_groups.lead_email = get_current_user_email()
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(family_groups.host_members) AS member
            WHERE member->>'email' = get_current_user_email()
          )
        )
    )
  );

-- RLS Policies for invoice_reminders_log
-- Supervisors can view all reminder logs
CREATE POLICY "Supervisors can view all reminder logs"
  ON invoice_reminders_log
  FOR SELECT
  USING (is_supervisor());

-- Organization admins and treasurers can view their organization's reminder logs
CREATE POLICY "Admins and treasurers can view reminder logs"
  ON invoice_reminders_log
  FOR SELECT
  USING (
    organization_id = get_user_organization_id() 
    AND is_organization_admin()
  );

-- System can insert reminder logs
CREATE POLICY "System can insert reminder logs"
  ON invoice_reminders_log
  FOR INSERT
  WITH CHECK (true);

-- Create helper function to generate next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
  invoice_num TEXT;
BEGIN
  -- Get current settings
  SELECT 
    COALESCE(invoice_prefix, 'INV-'),
    COALESCE(next_invoice_number, 1)
  INTO prefix, next_num
  FROM reservation_settings
  WHERE organization_id = org_id;
  
  -- If no settings exist, use defaults
  IF NOT FOUND THEN
    prefix := 'INV-';
    next_num := 1;
  END IF;
  
  -- Generate invoice number
  invoice_num := prefix || TO_CHAR(EXTRACT(YEAR FROM CURRENT_DATE), 'FM0000') || '-' || LPAD(next_num::TEXT, 4, '0');
  
  -- Increment the counter
  UPDATE reservation_settings
  SET next_invoice_number = next_num + 1
  WHERE organization_id = org_id;
  
  RETURN invoice_num;
END;
$$;

-- Create function to automatically update invoice balance
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate balance due
  NEW.balance_due := NEW.total_amount - NEW.amount_paid;
  
  -- Update status based on payment
  IF NEW.balance_due <= 0 THEN
    NEW.status := 'paid';
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
  ELSIF NEW.amount_paid > 0 AND NEW.amount_paid < NEW.total_amount THEN
    NEW.status := 'partial';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
    NEW.status := 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update invoice balance and status
CREATE TRIGGER update_invoice_balance_trigger
  BEFORE INSERT OR UPDATE OF amount_paid, total_amount, due_date
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();